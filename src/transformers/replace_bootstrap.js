"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ignoreDep typescript
const ts = require("typescript");
const path_1 = require("path");
const ast_helpers_1 = require("./ast_helpers");
const insert_import_1 = require("./insert_import");
const interfaces_1 = require("./interfaces");
const make_transform_1 = require("./make_transform");
function replaceBootstrap(shouldTransform, getEntryModule, getTypeChecker) {
    const standardTransform = function (sourceFile) {
        const ops = [];
        const entryModule = getEntryModule();
        if (!shouldTransform(sourceFile.fileName) || !entryModule) {
            return ops;
        }
        // Find all identifiers.
        const entryModuleIdentifiers = ast_helpers_1.collectDeepNodes(sourceFile, ts.SyntaxKind.Identifier)
            .filter(identifier => identifier.text === entryModule.className);
        if (entryModuleIdentifiers.length === 0) {
            return [];
        }
        const relativeEntryModulePath = path_1.relative(path_1.dirname(sourceFile.fileName), entryModule.path);
        const normalizedEntryModulePath = `./${relativeEntryModulePath}`.replace(/\\/g, '/');
        // Find the bootstrap calls.
        entryModuleIdentifiers.forEach(entryModuleIdentifier => {
            // Figure out if it's a `platformBrowserDynamic().bootstrapModule(AppModule)` call.
            if (!(entryModuleIdentifier.parent
                && entryModuleIdentifier.parent.kind === ts.SyntaxKind.CallExpression)) {
                return;
            }
            const callExpr = entryModuleIdentifier.parent;
            if (callExpr.expression.kind !== ts.SyntaxKind.PropertyAccessExpression) {
                return;
            }
            const propAccessExpr = callExpr.expression;
            if (propAccessExpr.name.text !== 'bootstrapModule'
                || propAccessExpr.expression.kind !== ts.SyntaxKind.CallExpression) {
                return;
            }
            const bootstrapModuleIdentifier = propAccessExpr.name;
            const innerCallExpr = propAccessExpr.expression;
            if (!(innerCallExpr.expression.kind === ts.SyntaxKind.Identifier
                && innerCallExpr.expression.text === 'platformBrowserDynamic')) {
                return;
            }
            const platformBrowserDynamicIdentifier = innerCallExpr.expression;
            const idPlatformBrowser = ts.createUniqueName('__NgCli_bootstrap_');
            const idNgFactory = ts.createUniqueName('__NgCli_bootstrap_');
            // Add the transform operations.
            const factoryClassName = entryModule.className + 'NgFactory';
            const factoryModulePath = normalizedEntryModulePath + '.ngfactory';
            ops.push(
            // Replace the entry module import.
            ...insert_import_1.insertStarImport(sourceFile, idNgFactory, factoryModulePath), new interfaces_1.ReplaceNodeOperation(sourceFile, entryModuleIdentifier, ts.createPropertyAccess(idNgFactory, ts.createIdentifier(factoryClassName))), 
            // Replace the platformBrowserDynamic import.
            ...insert_import_1.insertStarImport(sourceFile, idPlatformBrowser, '@angular/platform-browser'), new interfaces_1.ReplaceNodeOperation(sourceFile, platformBrowserDynamicIdentifier, ts.createPropertyAccess(idPlatformBrowser, 'platformBrowser')), new interfaces_1.ReplaceNodeOperation(sourceFile, bootstrapModuleIdentifier, ts.createIdentifier('bootstrapModuleFactory')));
        });
        return ops;
    };
    return make_transform_1.makeTransform(standardTransform, getTypeChecker);
}
exports.replaceBootstrap = replaceBootstrap;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/src/transformers/replace_bootstrap.js.map