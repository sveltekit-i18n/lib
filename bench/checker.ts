// What a typed construction and a typed call cost the checker through this
// package's shipped declarations, which fold the core's instance type through
// the curly parser's payload types. The tree's `dist/` declarations are the
// subject, resolving the core and the parser from the tree's own install; the
// compiler is this tree's.
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import { record, TREE } from './collect.ts';

const PROBE = resolve(dirname(fileURLToPath(import.meta.url)), 'types/probe.ts');

const SUBJECTS: Record<string, string> = {
  flat1k: '1,000 flat keys',
  flat10k: '10,000 flat keys',
  namespaced10k: '10,000 keys in namespaces',
};

const program = ts.createProgram({
  rootNames: [PROBE],
  options: {
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    types: [],
    paths: { 'sveltekit-i18n': [join(TREE, 'dist/index.d.ts')] },
  },
});
const checker = program.getTypeChecker();
const file = program.getSourceFile(PROBE);

if (!file) throw new Error('The probe is not in its program.');

/** The expression a statement of the probe measures, with its subject and its shape. */
const measured = (statement: ts.Statement): [ts.CallLikeExpression, string, string] | undefined => {
  if (ts.isVariableStatement(statement)) {
    const [declaration] = statement.declarationList.declarations;

    if (!declaration.initializer || !ts.isNewExpression(declaration.initializer)) return undefined;

    return [declaration.initializer, declaration.name.getText(file).replace(/^_/, ''), 'new I18n with a schema'];
  }

  if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) return undefined;

  const call = statement.expression;
  const access = call.expression as ts.PropertyAccessExpression;
  const method = access.name.getText(file);
  const payload = call.arguments.length > (method === 'l' ? 2 : 1);

  return [call, (access.expression as ts.Identifier).text, `${method} ${payload ? 'with' : 'without'} a payload`];
};

const warmed = new Set<string>();

// In source order, before anything else checks the file: each statement pays
// for what no earlier one instantiated.
for (const statement of file.statements) {
  const found = measured(statement);

  if (!found) continue;

  const [expression, subject, shape] = found;
  const id = `${shape} (${SUBJECTS[subject]})`;
  const before = program.getInstantiationCount();

  checker.getResolvedSignature(expression);

  if (!warmed.has(id)) {
    warmed.add(id);
    continue;
  }

  record(`instantiations, ${id}`, 'count', 'instantiations', program.getInstantiationCount() - before);
}

const diagnostics = ts.getPreEmitDiagnostics(program);

if (diagnostics.length) throw new Error(`The probe does not compile: ${diagnostics.map(({ messageText }) => ts.flattenDiagnosticMessageText(messageText, '\n')).join('\n')}`);
