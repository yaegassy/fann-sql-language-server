import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  TextDocumentSyncKind,
  InitializeResult,
  Position,
  Range,
  DocumentFormattingParams,
  TextEdit,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { Command } from 'commander';
import { Option, Parser } from 'node-sql-parser';
import PgQuery from 'pg-query-emscripten';
import { format } from 'sql-formatter';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const options = new Command('fann-sql-language-server')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  .version(require('../package.json').version)
  .option('--stdio', 'use stdio')
  .option('--node-ipc', 'use node-ipc')
  .option('--socket <port>', 'use socket. example: --socket=5000')
  .allowUnknownOption(true)
  .parse(process.argv);

const connection = createConnection(ProposedFeatures.all);

const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
  hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      documentFormattingProvider: true,
    },
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }
  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  if (hasWorkspaceFolderCapability) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log('Workspace folder change event received.');
    });
  }
});

interface fannSqlSettings {
  formatOptions: any;
  database: string;
  disableLint: boolean;
}

const defaultSettings: fannSqlSettings = {
  formatOptions: {},
  database: 'mysql',
  disableLint: false,
};
let globalSettings: fannSqlSettings = defaultSettings;

const documentSettings: Map<string, Thenable<fannSqlSettings>> = new Map();

connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    documentSettings.clear();
  } else {
    globalSettings = <fannSqlSettings>(change.settings['fann-sql'] || defaultSettings);
  }

  documents.all().forEach(doLint);
});

function getDocumentSettings(resource: string): Thenable<fannSqlSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'fann-sql',
    });
    documentSettings.set(resource, result);
  }
  return result;
}

documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri);
});

documents.onDidChangeContent((change) => {
  doLint(change.document);
});

async function doLint(textDocument: TextDocument): Promise<void> {
  const settings = await getDocumentSettings(textDocument.uri);

  const diagnostics: Diagnostic[] = [];

  try {
    const database = settings.database;
    if (database === 'postgresql') {
      // We use pg-query-parser for PostgreSQL
      const result = PgQuery.parse(textDocument.getText());
      // We use pg-query-parser for PostgreSQL
      if (result.error) {
        const { error } = result;
        const cursorPosition = error.cursorpos;
        error.range = {
          start: textDocument.positionAt(cursorPosition - 1),
          end: textDocument.positionAt(cursorPosition),
        };
        throw error;
      }
    } else {
      // All other databases use node-sql-parser
      const parser = new Parser();
      try {
        const opt: Option = { database };
        parser.parse(textDocument.getText(), opt);
      } catch (err) {
        if (err.name !== 'SyntaxError') {
          return;
        }
        const start = Position.create(err.location.start.line - 1, err.location.start.column);
        const end = Position.create(err.location.end.line - 1, err.location.end.column);
        const range = Range.create(start.line, start.character, end.line, end.character);
        err.range = range;
        throw err;
      }
    }
  } catch (err) {
    connection.console.info(`${JSON.stringify(err.range)} ${err.message}`);
    const diagnostic = {
      range: err.range,
      message: err.message,
      severity: DiagnosticSeverity.Error,
      source: 'fann-sql',
      relatedInformation: [],
    };
    diagnostics.push(diagnostic);
  }
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

export async function doFormat(document: TextDocument, range?: Range): Promise<string> {
  const settings = await getDocumentSettings(document.uri);
  const options = settings.formatOptions;
  const fileName = document.uri;

  const text = document.getText(range);
  return safeExecution(
    () => {
      return format(text, options);
    },
    text,
    fileName
  );
}

function safeExecution(
  cb: (() => string) | Promise<string>,
  defaultText: string,
  fileName: string
): string | Promise<string> {
  if (cb instanceof Promise) {
    return cb
      .then((returnValue) => {
        return returnValue;
      })
      .catch((err: Error) => {
        // eslint-disable-next-line no-console
        console.error(fileName, err);
        return defaultText;
      });
  }

  try {
    return cb();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(fileName, err);
    return defaultText;
  }
}

connection.onDocumentFormatting(async (params: DocumentFormattingParams) => {
  const { textDocument } = params;
  if (!textDocument || !textDocument.uri) {
    return;
  }

  const doc = documents.get(textDocument.uri);
  if (!doc) {
    return;
  }

  const code = await doFormat(doc);

  const range = Range.create(Position.create(0, 0), Position.create(doc.lineCount + 1, 0));

  return [TextEdit.replace(range, code)];
});

documents.listen(connection);
connection.listen();
