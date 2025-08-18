const vscode = require("vscode");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const fs = require("fs");
const path = require("path");
const t = require("@babel/types");

const generate = require("@babel/generator").default;

function saveDataForLang(params) {
    switch (params.type) {
        case "sis":
            return sis(params);
        case "myth":
            return myth(params);
        default:
            return [];
    }
}

function sis(params) {
    const { result, langFilePath } = params;
    if (!langFilePath) {
        vscode.window.showErrorMessage("未指定语言文件路径");
        return;
    }
    try {
        const fileContent = fs.readFileSync(langFilePath, "utf-8");

        // 使用 @babel/parser 解析文件
        const ast = parser.parse(fileContent, {
            sourceType: "module",
            plugins: ["typescript"],
        });

        traverse(ast, {
            VariableDeclarator(path) {
                // 查找 cn 和 en 变量声明
                if (path.node.id.name === "cn") {
                    // 更新 cn 对象的属性
                    if (
                        path.node.init &&
                        path.node.init.type === "ObjectExpression"
                    ) {
                        const properties = path.node.init.properties;

                        result.push.forEach((item) => {
                            properties.push(
                                t.objectProperty(
                                    t.stringLiteral(item.key),
                                    t.stringLiteral(item.zh)
                                )
                            );
                        });
                        result.zhEdit.forEach((item) => {
                            const index = properties.findIndex(
                                (prop) =>
                                    prop.key.value === item.key ||
                                    prop.key.name === item.key
                            );
                            if (index !== -1) {
                                properties[index].value.value = item.zh;
                            } else {
                                properties.push(
                                    t.objectProperty(
                                        t.stringLiteral(item.key),
                                        t.stringLiteral(item.zh)
                                    )
                                );
                            }
                        });
                        result.delete.forEach((item) => {
                            const index = properties.findIndex(
                                (prop) =>
                                    prop.key.value === item.key ||
                                    prop.key.name === item.key
                            );
                            if (index !== -1) {
                                properties.splice(index, 1);
                            }
                        });
                    }
                } else if (path.node.id.name === "en") {
                    // 更新 en 对象的属性
                    if (
                        path.node.init &&
                        path.node.init.type === "ObjectExpression"
                    ) {
                        const properties = path.node.init.properties;

                        result.push.forEach((item) => {
                            properties.push(
                                t.objectProperty(
                                    t.stringLiteral(item.key),
                                    t.stringLiteral(item.en)
                                )
                            );
                        });
                        result.zhEdit.forEach((item) => {
                            const index = properties.findIndex(
                                (prop) =>
                                    prop.key.value === item.key ||
                                    prop.key.name === item.key
                            );
                            if (index !== -1) {
                                properties[index].value.value = item.en;
                            } else {
                                properties.push(
                                    t.objectProperty(
                                        t.stringLiteral(item.key),
                                        t.stringLiteral(item.en)
                                    )
                                );
                            }
                        });
                        result.delete.forEach((item) => {
                            const index = properties.findIndex(
                                (prop) =>
                                    prop.key.value === item.key ||
                                    prop.key.name === item.key
                            );
                            if (index !== -1) {
                                properties.splice(index, 1);
                            }
                        });
                    }
                }
            },
        });

        // 使用 @babel/generator 生成更新后的代码
        const updatedCode = generate(ast, {
            retainLines: false, // 不保持原始行号，使用格式化选项
            compact: false, // 不压缩代码
            concise: false, // 不使用简洁格式
            jsescOption: {
                minimal: true, // 避免将中文转换为 Unicode 编码
            },
            indent: {
                // 设置缩进
                style: "  ", // 使用两个空格缩进
                base: 0, // 基础缩进为0
            },
            comments: true, // 保留注释
        }).code;

        // 将更新后的代码写回文件
        fs.writeFileSync(langFilePath, updatedCode, "utf-8");

        vscode.window.showInformationMessage("语言文件保存成功");

        return true;
    } catch (error) {
        vscode.window.showErrorMessage(`保存语言文件失败: ${error.message}`);
    }
}

function myth(params) {
    const { result, langFilePath } = params;
    const dir = path.dirname(langFilePath);
    let langFilePathCn = path.join(dir, "lang.cn.js");
    let langFilePathEn = path.join(dir, "lang.en.js");
    if (!langFilePath) {
        vscode.window.showErrorMessage("未指定语言文件路径");
        return;
    }
    try {
        if (langFilePathCn) {
            const fileContent = fs.readFileSync(langFilePathCn, "utf-8");
            // 使用 @babel/parser 解析文件
            const ast = parser.parse(fileContent, {
                sourceType: "module",
                plugins: ["typescript"],
            });
            traverse(ast, {
                VariableDeclarator(path) {
                    // 查找 cn 和 en 变量声明
                    if (path.node.id.name === "$lang") {
                        // 更新 cn 对象的属性
                        if (
                            path.node.init &&
                            path.node.init.type === "ObjectExpression"
                        ) {
                            const properties = path.node.init.properties;

                            result.push.forEach((item) => {
                                properties.push(
                                    t.objectProperty(
                                        t.stringLiteral(item.key),
                                        t.stringLiteral(item.zh)
                                    )
                                );
                            });
                            result.zhEdit.forEach((item) => {
                                const index = properties.findIndex(
                                    (prop) =>
                                        prop.key.value === item.key ||
                                        prop.key.name === item.key
                                );
                                if (index !== -1) {
                                    properties[index].value.value = item.zh;
                                } else {
                                    properties.push(
                                        t.objectProperty(
                                            t.stringLiteral(item.key),
                                            t.stringLiteral(item.zh)
                                        )
                                    );
                                }
                            });
                            result.delete.forEach((item) => {
                                const index = properties.findIndex(
                                    (prop) =>
                                        prop.key.value === item.key ||
                                        prop.key.name === item.key
                                );
                                if (index !== -1) {
                                    properties.splice(index, 1);
                                }
                            });
                        }
                    }
                },
            });
            // 使用 @babel/generator 生成更新后的代码
            const updatedCode = generate(ast, {
                retainLines: false, // 不保持原始行号，使用格式化选项
                compact: false, // 不压缩代码
                concise: false, // 不使用简洁格式
                jsescOption: {
                    minimal: true, // 避免将中文转换为 Unicode 编码
                },
                indent: {
                    // 设置缩进
                    style: "  ", // 使用两个空格缩进
                    base: 0, // 基础缩进为0
                },
                comments: true, // 保留注释
            }).code;
            // 将更新后的代码写回文件
            fs.writeFileSync(langFilePathCn, updatedCode, "utf-8");
            vscode.window.showInformationMessage("中文语言文件保存成功");
        }
        if (langFilePathEn) {
            const fileContent = fs.readFileSync(langFilePathEn, "utf-8");
            // 使用 @babel/parser 解析文件
            const ast = parser.parse(fileContent, {
                sourceType: "module",
                plugins: ["typescript"],
            });

            traverse(ast, {
                VariableDeclarator(path) {
                    // 查找 cn 和 en 变量声明
                    if (path.node.id.name === "$lang") {
                        // 更新 cn 对象的属性
                        if (
                            path.node.init &&
                            path.node.init.type === "ObjectExpression"
                        ) {
                            const properties = path.node.init.properties;

                            result.push.forEach((item) => {
                                properties.push(
                                    t.objectProperty(
                                        t.stringLiteral(item.key),
                                        t.stringLiteral(item.en)
                                    )
                                );
                            });
                            result.enEdit.forEach((item) => {
                                const index = properties.findIndex(
                                    (prop) =>
                                        prop.key.value === item.key ||
                                        prop.key.name === item.key
                                );
                                if (index !== -1) {
                                    properties[index].value.value = item.en;
                                } else {
                                    properties.push(
                                        t.objectProperty(
                                            t.stringLiteral(item.key),
                                            t.stringLiteral(item.en)
                                        )
                                    );
                                }
                            });
                            result.delete.forEach((item) => {
                                const index = properties.findIndex(
                                    (prop) =>
                                        prop.key.value === item.key ||
                                        prop.key.name === item.key
                                );
                                if (index !== -1) {
                                    properties.splice(index, 1);
                                }
                            });
                        }
                    }
                },
            });
            // 使用 @babel/generator 生成更新后的代码
            const updatedCode = generate(ast, {
                retainLines: false, // 不保持原始行号，使用格式化选项
                compact: false, // 不压缩代码
                concise: false, // 不使用简洁格式
                jsescOption: {
                    minimal: true, // 避免将中文转换为 Unicode 编码
                },
                indent: {
                    // 设置缩进
                    style: "  ", // 使用两个空格缩进
                    base: 0, // 基础缩进为0
                },
                comments: true, // 保留注释
            }).code;

            // 将更新后的代码写回文件
            fs.writeFileSync(langFilePathEn, updatedCode, "utf-8");

            vscode.window.showInformationMessage("英文语言文件保存成功");
        }

        return true;
    } catch (error) {
        vscode.window.showErrorMessage(`保存语言文件失败: ${error.message}`);
    }
}

module.exports = { saveDataForLang };
