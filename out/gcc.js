"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
class GCC {
    constructor() {
        this.file_conf = {
            build_select: "configuration_name",
            configurations: [
                {
                    name: "configuration_name",
                    prj_name: "project_name",
                    loader_path: "",
                    c_include_paths: [""],
                    a_include_paths: [""],
                    c_source_paths: [""],
                    general_flags: ["mcpu=cortex-m0", "specs=nosys.specs"],
                    a_output_flags: ["Wa,--warn"],
                    c_output_flags: ["Og", "std=gnu11"],
                    l_output_flags: ["Wl,--defsym=malloc_getpagesize_P=0x1000"],
                    a_defines: [""],
                    c_defines: [""],
                    l_library: [""],
                    exclude_paths: [""],
                    exclude_files: [""],
                    toolchain_path: "",
                }
            ]
        };
        this.target_folder = "";
        this.bash_cmd = "";
        this.compiled_file = "";
        this.flags = "";
        this.output_flags = "";
        this.defines = "";
        this.include_paths = "";
        this.input = "";
        this.output = "";
        this.to_be_build = false;
        this.build_configuration = [];
        if (!fs.existsSync(vscode.workspace.rootPath + "/.vscode/arm_toolchain.json")) {
            fs.writeFileSync(vscode.workspace.rootPath + "/.vscode/arm_toolchain.json", JSON.stringify(this.file_conf, null, 2));
        }
        var valid = this.popolate_configuration(fs.readFileSync(vscode.workspace.rootPath + "/.vscode/arm_toolchain.json", 'utf8').toString());
        if (!valid) {
            vscode.window.showErrorMessage("JSON FILE not valid");
        }
        this.init_current_build();
        this.sb_current_build = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this.sb_current_build.text = this.file_conf.build_select.toString();
        const build_choose_cmd_id = 'build.choose';
        vscode.commands.registerCommand(build_choose_cmd_id, () => {
            this.build_configuration = [];
            this.popolate_configuration(fs.readFileSync(vscode.workspace.rootPath + "/.vscode/arm_toolchain.json", 'utf8').toString());
            var dialog = vscode.window.showQuickPick(this.build_configuration, {
                onDidSelectItem: (item) => {
                    this.sb_current_build.text = item.toString();
                    this.file_conf.build_select = item.toString();
                    fs.writeFile(vscode.workspace.rootPath + "/.vscode/arm_toolchain.json", JSON.stringify(this.file_conf, null, 2), (err) => {
                        if (err) {
                            console.log(err);
                            return;
                        }
                    });
                }
            });
        });
        this.sb_current_build.command = build_choose_cmd_id;
        this.sb_current_build.show();
        this.RefreshExcludeView();
    }
    init_current_build() {
        var valid = this.file_conf.configurations.find(item => item.name === this.file_conf.build_select);
        if (!valid) {
            this.file_conf.build_select = this.file_conf.configurations[0].name;
            fs.writeFileSync(vscode.workspace.rootPath + "/.vscode/arm_toolchain.json", JSON.stringify(this.file_conf, null, 2));
        }
    }
    update_data(data) {
        var new_json = JSON.parse(data);
        var build_select_change = 1;
        for (var i = 0; i < new_json.configurations.length; i++) {
            if (this.file_conf.build_select === new_json.configurations[i].name) {
                build_select_change = 0;
                break;
            }
        }
        new_json.build_select = new_json.configurations[0].name;
        if (build_select_change) {
            for (var i = 0; i < new_json.configurations.length; i++) {
                if (this.file_conf.configurations[i].name !== new_json.configurations[i].name) {
                    new_json.build_select = new_json.configurations[i].name;
                    this.sb_current_build.text = new_json.build_select;
                    break;
                }
            }
        }
        this.file_conf = new_json;
        fs.writeFileSync(vscode.workspace.rootPath + "/.vscode/arm_toolchain.json", JSON.stringify(this.file_conf, null, 2));
        this.RefreshExcludeView();
    }
    refresh(data) {
        var valid = this.popolate_configuration(data);
        if (!valid) {
            vscode.window.showInformationMessage("config file error");
            return;
        }
        this.RefreshExcludeView();
    }
    build(settings, clean) {
        var valid = this.popolate_configuration(settings);
        if (!valid) {
            vscode.window.showInformationMessage("config file error");
            return;
        }
        this.to_be_build = false;
        this.bash_cmd = "";
        this.compiled_file = "";
        var build_selected = 0;
        for (var i = 0; i < this.build_configuration.length; i++) {
            if (this.file_conf.build_select === this.file_conf.configurations[i].name) {
                build_selected = i;
            }
        }
        this.append_cmd("#!/bin/bash");
        this.append_cmd("START_TIME=$(($(date +%s)))");
        this.target_folder = "";
        if (vscode.workspace.rootPath != undefined) {
            this.target_folder = vscode.Uri.file(path.join(vscode.workspace.rootPath, this.file_conf.configurations[build_selected].name.toString())).fsPath.toString();
        }
        var prj_name = this.file_conf.configurations[build_selected].prj_name;
        var loader_file = this.file_conf.configurations[build_selected].loader_path;
        this.flags = this.concat_arr_string(this.file_conf.configurations[build_selected].general_flags, "-");
        if (clean == true) {
            if (fs.existsSync(this.target_folder) == true) {
                require('fs-extra').removeSync(this.target_folder);
            }
            require('fs-extra').mkdirpSync(this.target_folder);
        }
        if (this.file_conf.configurations[build_selected].c_source_paths.length == 0) {
            this.append_cmd("echo error: No Sources");
            fs.writeFileSync(this.target_folder + "/compile.sh", this.bash_cmd);
            let task = new vscode.Task({ type: 'shell', task: 'compile' }, 'compile', 'shell', new vscode.ShellExecution('bash ' + this.target_folder + "/compile.sh"), "$gcc");
            task.presentationOptions.clear = true;
            vscode.tasks.executeTask(task);
            return;
        }
        else {
            for (let source_dir of this.file_conf.configurations[build_selected].c_source_paths) {
                let dir = path.parse(vscode.workspace.rootPath + "/" + source_dir).dir;
                this.compile_file(dir, clean, build_selected);
            }
        }
        this.output_flags = this.concat_arr_string(this.file_conf.configurations[build_selected].l_output_flags, "-");
        this.defines = this.concat_arr_string(this.file_conf.configurations[build_selected].l_library, "-L");
        var linker_cmd = this.generate_cmd(this.file_conf.configurations[build_selected].toolchain_path + " -o ", this.target_folder + "/" + prj_name + ".elf", this.compiled_file, this.flags, "-T" + loader_file, "-Wl,-Map=" + this.target_folder + "/" + prj_name + ".map", this.output_flags);
        if (this.to_be_build || clean) {
            this.append_cmd(linker_cmd);
            this.append_cmd("echo Generate bin..");
            this.append_cmd("arm-none-eabi-objcopy -S -O binary " + this.target_folder + "/" + prj_name + ".elf " + this.target_folder + "/" + prj_name + ".bin");
        }
        this.append_cmd("echo Print size info..");
        this.append_cmd("arm-none-eabi-size " + this.target_folder + "/" + prj_name + ".elf");
        this.append_cmd("END_TIME=$(($(date +%s)))");
        this.append_cmd("echo Build Time : $(($END_TIME - $START_TIME)) s");
        fs.writeFileSync(this.target_folder + "/compile.sh", this.bash_cmd);
        let task = new vscode.Task({ type: 'shell', task: 'compile' }, 'compile', 'shell', new vscode.ShellExecution('bash ' + this.target_folder + "/compile.sh"), "$gcc");
        task.presentationOptions.clear = true;
        vscode.tasks.executeTask(task);
        return;
    }
    compile_file(url, clean, build_selected) {
        var uris = fs.readdirSync(url);
        var filter = uris.filter((string) => {
            return string[0].localeCompare(".");
        });
        for (let item of filter) {
            var uri = fs.statSync(url + "/" + item);
            let relative_path = url.split(vscode.workspace.rootPath + "/")[1];
            if (this.file_conf.configurations[build_selected].exclude_paths.find(exclude_dir => exclude_dir === relative_path)) {
                continue;
            }
            if (uri.isDirectory()) {
                this.compile_file(url + "/" + item, clean, build_selected);
            }
            let target_url = this.target_folder + "/" + relative_path;
            /** compile */
            this.input = url + "/" + item;
            this.output = target_url + "/" + path.parse(this.input).name + ".o";
            var cmd = "";
            if (path.parse(item).ext === ".c") {
                this.output_flags = this.concat_arr_string(this.file_conf.configurations[build_selected].c_output_flags, "-");
                this.defines = this.concat_arr_string(this.file_conf.configurations[build_selected].c_defines, "-D");
                this.include_paths = this.concat_arr_string(this.file_conf.configurations[build_selected].c_include_paths, "-I");
                cmd = this.generate_cmd(this.file_conf.configurations[build_selected].toolchain_path + " -c ", this.input, this.flags, this.defines, this.include_paths, this.output_flags, " -o ", this.output);
            }
            else if (path.parse(item).ext === ".s") {
                this.output_flags = this.concat_arr_string(this.file_conf.configurations[build_selected].a_output_flags, "-");
                this.include_paths = this.concat_arr_string(this.file_conf.configurations[build_selected].a_include_paths, "-I");
                this.defines = this.concat_arr_string(this.file_conf.configurations[build_selected].a_defines, "-D");
                cmd = this.generate_cmd(this.file_conf.configurations[build_selected].toolchain_path + " -c ", this.flags, this.defines, this.include_paths, this.output_flags, " -o ", this.output, this.input);
            }
            else {
                continue;
            }
            if (this.file_conf.configurations[build_selected].exclude_files.find(exclude_dir => path.parse(exclude_dir).base === item)) {
                continue;
            }
            if (fs.existsSync(target_url) == false) {
                require('fs-extra').mkdirpSync(target_url);
            }
            var input_date = fs.statSync(this.input).birthtimeMs;
            var output_date = 0;
            if (fs.existsSync(this.output)) {
                output_date = fs.statSync(this.output).birthtimeMs;
            }
            if (input_date > output_date || clean) {
                this.append_cmd("echo " + relative_path + "/" + path.parse(this.input).base);
                this.append_cmd(cmd);
                this.to_be_build = true;
            }
            this.compiled_file = this.compiled_file + " " + this.output;
        }
        return;
    }
    popolate_configuration(settings) {
        var json_tmp = JSON.parse(settings);
        if (json_tmp.build_select == undefined) {
            vscode.window.showInformationMessage("no 'build_select' field");
            return false;
        }
        if (json_tmp.configurations == undefined) {
            vscode.window.showInformationMessage("no 'configurations' field");
            return false;
        }
        for (var i = 0; i < json_tmp.configurations.length; i++) {
            if (json_tmp.configurations[i].name == undefined) {
                vscode.window.showErrorMessage("no configuration 'name' field");
                return false;
            }
            if (json_tmp.configurations[i].prj_name == undefined) {
                vscode.window.showErrorMessage("no 'prj_name' field");
                return false;
            }
            if (json_tmp.configurations[i].loader_path == undefined) {
                vscode.window.showErrorMessage("no 'loader_path' field");
                return false;
            }
            if (json_tmp.configurations[i].c_include_paths == undefined) {
                vscode.window.showInformationMessage("no 'c_include_paths' field");
                return false;
            }
            if (json_tmp.configurations[i].a_include_paths == undefined) {
                vscode.window.showInformationMessage("no 'a_include_paths' field");
                return false;
            }
            if (json_tmp.configurations[i].c_source_paths == undefined) {
                vscode.window.showInformationMessage("no 'c_source_paths' field");
                return false;
            }
            if (!json_tmp.configurations[i].general_flags) {
                vscode.window.showInformationMessage("no 'general_flags' field");
                return false;
            }
            if (!json_tmp.configurations[i].a_output_flags) {
                vscode.window.showInformationMessage("no 'a_output_flags' field");
                return false;
            }
            if (!json_tmp.configurations[i].c_output_flags) {
                vscode.window.showInformationMessage("no 'c_output_flags' field");
                return false;
            }
            if (!json_tmp.configurations[i].l_output_flags) {
                vscode.window.showInformationMessage("no 'l_output_flags' field");
                return false;
            }
            if (!json_tmp.configurations[i].a_defines) {
                vscode.window.showInformationMessage("no 'a_defines' field");
                return false;
            }
            if (!json_tmp.configurations[i].c_defines) {
                vscode.window.showInformationMessage("no 'c_defines' field");
                return false;
            }
            if (!json_tmp.configurations[i].l_library) {
                vscode.window.showInformationMessage("no 'l_library' field");
                return false;
            }
            this.build_configuration[i] = json_tmp.configurations[i].name;
        }
        this.file_conf = json_tmp;
        /** extraxt function name */
        return true;
    }
    append_cmd(cmd) {
        this.bash_cmd = this.bash_cmd + cmd + "\n";
    }
    concat_arr_string(array, prefix, suffix) {
        var return_string = "";
        if (prefix == undefined)
            prefix = "";
        if (suffix == undefined)
            suffix = " ";
        for (let item of array) {
            return_string = return_string + prefix + item + suffix;
        }
        return return_string;
    }
    generate_cmd(cmd, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
        var gemerate_cmd = "";
        if (arg1 == undefined)
            arg1 = "";
        if (arg2 == undefined)
            arg2 = "";
        if (arg3 == undefined)
            arg3 = "";
        if (arg4 == undefined)
            arg4 = "";
        if (arg5 == undefined)
            arg5 = "";
        if (arg6 == undefined)
            arg6 = "";
        if (arg7 == undefined)
            arg7 = "";
        gemerate_cmd = cmd + " " + arg1 + " " + arg2 + " " + arg3 + " " + arg4 + " " + arg5 + " " + arg6 + " " + arg7;
        return gemerate_cmd;
    }
    getData() {
        var valid = this.popolate_configuration(fs.readFileSync(vscode.workspace.rootPath + "/.vscode/arm_toolchain.json", 'utf8').toString());
        if (!valid) {
            vscode.window.showErrorMessage("JSON FILE not valid");
        }
        return JSON.stringify(this.file_conf);
    }
    addExcludePath(dir) {
        var build_selected = 0;
        for (var i = 0; i < this.build_configuration.length; i++) {
            if (this.file_conf.build_select === this.file_conf.configurations[i].name) {
                build_selected = i;
            }
        }
        if (path.parse(dir).ext === "") {
            this.file_conf.configurations[build_selected].exclude_paths.push(dir);
        }
        else {
            this.file_conf.configurations[build_selected].exclude_files.push(dir);
        }
        fs.writeFileSync(vscode.workspace.rootPath + "/.vscode/arm_toolchain.json", JSON.stringify(this.file_conf, null, 2));
        this.UpdateExcludeView(dir, true);
    }
    UpdateExcludeView(dir, visibility) {
        //add to exclude
        if (vscode.workspace.rootPath != undefined) {
            var settingsFile = path.join(vscode.workspace.rootPath, '.vscode/settings.json');
            // modifiy visibility of boolean type file exclusions
            let settings = JSON.parse(fs.readFileSync(settingsFile).toString());
            if (settings['files.exclude']) {
                settings['files.exclude'][dir] = visibility;
                // write the updated settings to file
                fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
            }
        }
    }
    RefreshExcludeView() {
        if (vscode.workspace.rootPath != undefined) {
            var settingsFile = path.join(vscode.workspace.rootPath, '.vscode/settings.json');
            // modifiy visibility of boolean type file exclusions
            let settings = JSON.parse(fs.readFileSync(settingsFile).toString());
            var build_selected = 0;
            for (var i = 0; i < this.build_configuration.length; i++) {
                if (this.file_conf.build_select === this.file_conf.configurations[i].name) {
                    build_selected = i;
                }
            }
            for (var item in settings['files.exclude']) {
                if (item.startsWith(".") || item.startsWith("*")) {
                    continue;
                }
                if (vscode.workspace.rootPath != undefined) {
                    let item_abs = vscode.Uri.file(path.join(vscode.workspace.rootPath, item)).fsPath.toString();
                    //relative directory
                    for (var src in this.file_conf.configurations[build_selected].c_source_paths) {
                        var src_string = vscode.Uri.file(path.join(vscode.workspace.rootPath, this.file_conf.configurations[build_selected].c_source_paths[src])).fsPath.toString();
                        if (item_abs.includes(src_string)) {
                            delete settings['files.exclude'][item];
                        }
                    }
                }
            }
            for (var exc_idx in this.file_conf.configurations[build_selected].exclude_paths) {
                var exc = this.file_conf.configurations[build_selected].exclude_paths[exc_idx];
                settings['files.exclude'][exc] = true;
            }
            for (var exc_idx in this.file_conf.configurations[build_selected].exclude_files) {
                var exc = this.file_conf.configurations[build_selected].exclude_files[exc_idx];
                settings['files.exclude'][exc] = true;
            }
            fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
        }
    }
}
exports.GCC = GCC;
//# sourceMappingURL=gcc.js.map