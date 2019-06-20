var json;
const vscode = acquireVsCodeApi();

const default_configuration= {
        name: "configuration name",
        prj_name: "project_name",
        loader_path: "",
        c_include_paths: [""],
        a_include_paths: ["Wa,--warn"],
        c_source_paths: [""],
        general_flags: ["mcpu=cortex-m0"],
        a_output_flags: [""],
        c_output_flags: ["Og","std=gnu11"],
        l_output_flags: ["Wl,--defsym=malloc_getpagesize_P=0x100"],
        a_defines: [""],
        c_defines: [""],
        l_library: [""],
        exclude_paths: [""],
        exclude_files: [""]
};


class UI{

    constructor()
    {
        window.addEventListener('message', event => {
            switch(event.data.command)
            {
                case 'update-data-view':

                    json = JSON.parse(event.data.text);
                    var selected = json.configurations.findIndex((configuration)=>{return configuration.name.toString().localeCompare(json.build_select) == 0}); 
                    this.update_view(json.configurations[selected]);
                    break;
            }
        });

        vscode.postMessage({
            command: 'request-data'
        })
        
        document.getElementById('main').addEventListener('change', event =>{
            var elem = document.getElementById(event.srcElement.id);
            if(elem.tagName.toString().localeCompare("TEXTAREA") == 0)
            {
                document.getElementById(event.srcElement.id).textContent = event.srcElement.value;

                if(elem.id == 'configuration-name')
                {
                    //change element name
                    var index = document.getElementById('configuration-list').selectedIndex;
                    json.configurations[index].name = elem.textContent;
                    this.context_changed();
                    this.update_view(json.configurations[index]);
                }
            }
            else if(event.srcElement.id == 'configuration-list')
            {
                var index = elem.selectedIndex;
                document.getElementById('configuration-name').textContent = json.configurations[index].name;
                this.update_view(json.configurations[index]);
                return;
            }
            this.context_changed();
        });

        document.getElementById('remove-configuration').addEventListener('click',event=>
        {
            json.configurations.splice(document.getElementById('configuration-list').selectedIndex,1);
            console.log(json);
            this.update_view(json.configurations[0]);
            this.context_changed();
        });

        document.getElementById('add-configuration').addEventListener('click',event=>
        {
            var json_configuration = default_configuration;
            json_configuration.name = "configuration name";
            json.configurations.push(json_configuration);
            this.update_view(json_configuration);
            this.context_changed();
        });

        document.getElementById('add-copy-configuration').addEventListener('click',event=>
        {
            var json_configuration = default_configuration;
            Object.assign(json_configuration,json.configurations[document.getElementById('configuration-list').selectedIndex]);
            json_configuration.name = "configuration name";
            json.configurations.push(json_configuration);
            this.update_view(json_configuration);
            this.context_changed();
        });

    }

    context_changed()
    {

        var selected = document.getElementById('configuration-list').selectedIndex;

        json.configurations[selected].name = document.getElementById('configuration-name').textContent;   
        json.configurations[selected].prj_name = this.get_item('project-name');
        json.configurations[selected].loader_path = this.get_item('linker-script');
        json.configurations[selected].exclude_paths = this.get_array_item('exclude-paths','\n');
        json.configurations[selected].exclude_files = this.get_array_item('exclude-files','\n');
        json.configurations[selected].c_include_paths = this.get_array_item('compiler-include-path','\n');
        json.configurations[selected].c_source_paths = this.get_array_item('compiler-source-path','\n');
        json.configurations[selected].a_include_paths = this.get_array_item('assembler-include-path','\n');
        json.configurations[selected].l_library = this.get_array_item('linker-library','\n');
        json.configurations[selected].c_defines = this.get_array_item('compiler-defines',"\n");
        json.configurations[selected].a_defines = this.get_array_item('assembler-defines',"\n");
        json.configurations[selected].general_flags = this.get_general_flags();
        json.configurations[selected].a_output_flags = this.get_assembler_ouput_flags();
        json.configurations[selected].c_output_flags = this.get_compiler_output_flags();
        json.configurations[selected].l_output_flags = this.get_linker_output_flags();

        vscode.postMessage({
            command: 'update-data',
            data: JSON.stringify(json)
        })

        return;
    }

    update_view(configurations)
    {
        console.log(configurations);
        this.refresh_configuration_list(configurations.name);
        this.fill_text('project-name',configurations.prj_name);
        this.general_flags(configurations.general_flags);
        this.fill_text_area('exclude-paths',configurations.exclude_paths);
        this.fill_text_area('exclude-files',configurations.exclude_files);
        this.fill_text_area('assembler-include-path',configurations.a_include_paths);
        this.fill_text_area('assembler-defines',configurations.a_defines);
        this.assembler_output_flags(configurations.a_output_flags);
        this.fill_text_area('compiler-include-path',configurations.c_include_paths);
        this.fill_text_area('compiler-defines',configurations.c_defines);
        this.fill_text_area('compiler-source-path',configurations.c_source_paths);
        this.compiler_output_flags(configurations.c_output_flags);
        this.fill_text_area('linker-library',configurations.l_library);
        this.fill_text('linker-script',configurations.loader_path);
        this.linker_output_flags(configurations.l_output_flags);
    }

    refresh_configuration_list(name)
    {
        console.log(name);
        var element = document.getElementById('configuration-list');

        for (var item  in element.options)
        {
            element.options[item] = null;
        }
        for (var item in json.configurations)
        {
            var option = document.createElement('option');
            option.text = json.configurations[item].name;
            element.appendChild(option);

            if( json.configurations[item].name.toString().localeCompare(name)==0)
            {
                element.selectedIndex = item;
                document.getElementById('configuration-name').textContent = json.configurations[item].name;
            }
        }
    }

    //ok
    general_flags(options)
    {
        var elemen =  document.getElementById('library-list');
        elemen.selectedIndex = elemen.options['library-standard'].index;

        elemen =  document.getElementById('mcpu-type');
        elemen.selectedIndex = elemen.options['mcpu-m0'].index;

        elemen =  document.getElementById('instruction-set');
        elemen.selectedIndex = elemen.options['instruction-set-arm'].index;

        elemen =  document.getElementById('fpu-type');
        elemen.selectedIndex = elemen.options['fpu-type-sw'].index;

        elemen =  document.getElementById('fpu');
        elemen.selectedIndex = elemen.options['fpu-none'].index;

        elemen =  document.getElementById('pipe-compiler');
        elemen.checked = false;

        for(var item in options)
        {
            if(options[item].toString().localeCompare('specs=nano.specs') == 0)
            {
                elemen =  document.getElementById('library-list');
                elemen.selectedIndex = elemen.options['library-nano'].index;
            }
            else if(options[item].toString().localeCompare('mthumb') == 0)
            {
                elemen =  document.getElementById('instruction-set');
                elemen.selectedIndex = elemen.options['instruction-set-thumb'].index;
            }
            else if(options[item].toString().localeCompare('mfloat-abi=softfp') == 0)
            {
                elemen =  document.getElementById('fpu-type');
                elemen.selectedIndex = elemen.options['fpu-type-swhw'].index;
            }
            else if(options[item].toString().localeCompare('mfloat-abi=hard') == 0)
            {
                elemen =  document.getElementById('fpu-type');
                elemen.selectedIndex = elemen.options['fpu-type-hw'].index;
            }
            else if(options[item].toString().localeCompare('mfpu=fpv4-sp-d16') == 0)
            {
                elemen =  document.getElementById('fpu');
                elemen.selectedIndex = elemen.options['fpu-fpv4'].index;
            }
            else if(options[item].toString().localeCompare('mcpu=cortex-m0') == 0)
            {
                elemen =  document.getElementById('mcpu-type');
                elemen.selectedIndex = elemen.options['mcpu-m0'].index;
            }
            else if(options[item].toString().localeCompare('mcpu=cortex-m0plus') == 0)
            {
                elemen =  document.getElementById('mcpu-type');
                elemen.selectedIndex = elemen.options['mcpu-m0+'].index;
            }
            else if(options[item].toString().localeCompare('mcpu=cortex-m1') == 0)
            {
                elemen =  document.getElementById('mcpu-type');
                elemen.selectedIndex = elemen.options['mcpu-m1'].index;
            }
            else if(options[item].toString().localeCompare('mcpu=cortex-m3') == 0)
            {
                elemen =  document.getElementById('mcpu-type');
                elemen.selectedIndex = elemen.options['mcpu-m3'].index;
            }
            else if(options[item].toString().localeCompare('mcpu=cortex-m4') == 0)
            {
                elemen =  document.getElementById('mcpu-type');
                elemen.selectedIndex = elemen.options['mcpu-m4'].index;
            }
            else if(options[item].toString().localeCompare('mcpu=cortex-m7') == 0)
            {
                elemen =  document.getElementById('mcpu-type');
                elemen.selectedIndex = elemen.options['mcpu-m7'].index;
            }
            else if(options[item].toString().localeCompare('pipe') == 0)
            {
                elemen =  document.getElementById('pipe-compiler');
                elemen.checked = true;
            }
            
        }
    }
    //ok
    fill_text_area(id,items)
    {
        var element = document.getElementById(id);
        element.textContent="";
        console.log(items);
        for(var idx in items)
        {
            console.log("idx: "+ idx);
            element.textContent = element.textContent  + items[idx] + "\n";
        }
    }
    //ok
    fill_linear_array_text(id,item)
    {
        var element = document.getElementById(id);
        element.textContent = element.textContent + item + " ";
    }

    fill_text(id,item)
    {
        var element = document.getElementById(id);
        element.textContent =  item ;
    }
    //ok
    assembler_output_flags(flags)
    {
        var elemen =  document.getElementById('assembler-debug-level');
        elemen.selectedIndex = elemen.options['assembler-dbg_lebel-none'].index;

        elemen =  document.getElementById('assembler-suppress-warn');
        elemen.checked = false;

        elemen =  document.getElementById('preprocess-assembler');
        elemen.checked = false;

        elemen = document.getElementById('assembler-other-options');
        elemen.textContent = "";

        for(var idx in flags)
        {
            if(flags[idx].toString().localeCompare('g') == 0)
            {
                elemen =  document.getElementById('assembler-debug-level');
                elemen.selectedIndex = elemen.options['assembler-dbg_lebel-g'].index;
            }
            else if(flags[idx].toString().localeCompare('g1') == 0)
            {
                elemen =  document.getElementById('assembler-debug-level');
                elemen.selectedIndex = elemen.options['assembler-dbg_lebel-g1'].index;
            }
            else if(flags[idx].toString().localeCompare('g3') == 0)
            {
                elemen =  document.getElementById('assembler-debug-level');
                elemen.selectedIndex = elemen.options['assembler-dbg_lebel-g3'].index;
            }
            else if(flags[idx].toString().localeCompare('Wa,--warn') == 0)
            {
                elemen =  document.getElementById('assembler-suppress-warn');
                elemen.checked = false;
            }
            else if(flags[idx].toString().localeCompare('Wa,--no-warn') == 0)
            {
                elemen =  document.getElementById('assembler-suppress-warn');
                elemen.checked = true;
            }
            else if(flags[idx].toString().localeCompare('x assembler-with-cpp') == 0)
            {
                elemen =  document.getElementById('preprocess-assembler');
                elemen.checked = true;
            }
            else
            {
                this.fill_linear_array_text('assembler-other-options',flags[idx])
            }
        }
    }
    //ok
    compiler_output_flags(flags)
    {
        var elemen =  document.getElementById('compiler-debug-level');
        elemen.selectedIndex = elemen.options['compiler-dbg_lebel-none'].index;

        elemen =  document.getElementById('c-std');
        elemen.selectedIndex = elemen.options['c-std-gnu11'].index;

        elemen =  document.getElementById('compiler-optimization');
        elemen.selectedIndex = elemen.options['compiler-optimization-Og'].index;

        elemen =  document.getElementById('compiler-rm-dead-code');
        elemen.checked = false;

        elemen =  document.getElementById('compiler-rm-dead-data');
        elemen.checked = false;

        elemen = document.getElementById('compiler-other-options');
        elemen.textContent = "";
        for(var idx in flags)
        {
            if(flags[idx].toString().localeCompare('g') == 0)
            {
                elemen =  document.getElementById('compiler-debug-level');
                elemen.selectedIndex = elemen.options['compiler-dbg_lebel-g'].index;
            }
            else if(flags[idx].toString().localeCompare('g1') == 0)
            {
                elemen =  document.getElementById('compiler-debug-level');
                elemen.selectedIndex = elemen.options['compiler-dbg_lebel-g1'].index;
            }
            else if(flags[idx].toString().localeCompare('g3') == 0)
            {
                elemen =  document.getElementById('compiler-debug-level');
                elemen.selectedIndex = elemen.options['compiler-dbg_lebel-g3'].index;
            }
            else if(flags[idx].toString().localeCompare('std=c99') == 0)
            {
                elemen =  document.getElementById('c-std');
                elemen.selectedIndex = elemen.options['c-std-c99'].index;
            }
            else if(flags[idx].toString().localeCompare('std=c11') == 0)
            {
                elemen =  document.getElementById('c-std');
                elemen.selectedIndex = elemen.options['c-std-c11'].index;
            }
            else if(flags[idx].toString().localeCompare('std=gnu99') == 0)
            {
                elemen =  document.getElementById('c-std');
                elemen.selectedIndex = elemen.options['c-std-gnu99'].index;
            }
            else if(flags[idx].toString().localeCompare('std=gnu11') == 0)
            {
                elemen =  document.getElementById('c-std');
                elemen.selectedIndex = elemen.options['c-std-gnu11'].index;
            }
            else if(flags[idx].toString().localeCompare('O0') == 0)
            {
                elemen =  document.getElementById('compiler-optimization');
                elemen.selectedIndex = elemen.options['compiler-optimization-O0'].index;
            }
            else if(flags[idx].toString().localeCompare('Og') == 0)
            {
                elemen =  document.getElementById('compiler-optimization');
                elemen.selectedIndex = elemen.options['compiler-optimization-Og'].index;
            }
            else if(flags[idx].toString().localeCompare('O1') == 0)
            {
                elemen =  document.getElementById('compiler-optimization');
                elemen.selectedIndex = elemen.options['compiler-optimization-O1'].index;
            }
            else if(flags[idx].toString().localeCompare('O2') == 0)
            {
                elemen =  document.getElementById('compiler-optimization');
                elemen.selectedIndex = elemen.options['compiler-optimization-O2'].index;
            }
            else if(flags[idx].toString().localeCompare('O3') == 0)
            {
                elemen =  document.getElementById('compiler-optimization');
                elemen.selectedIndex = elemen.options['compiler-optimization-O3'].index;
            }
            else if(flags[idx].toString().localeCompare('Os') == 0)
            {
                elemen =  document.getElementById('compiler-optimization');
                elemen.selectedIndex = elemen.options['compiler-optimization-Os'].index;
            }
            else if(flags[idx].toString().localeCompare('Ofast') == 0)
            {
                elemen =  document.getElementById('compiler-optimization');
                elemen.selectedIndex = elemen.options['compiler-optimization-Ofast'].index;
            }
            else if(flags[idx].toString().localeCompare('ffunction-sections') == 0)
            {
                elemen =  document.getElementById('compiler-rm-dead-code');
                elemen.checked = true;
            }
            else if(flags[idx].toString().localeCompare('fdata-sections') == 0)
            {
                elemen =  document.getElementById('compiler-rm-dead-data');
                elemen.checked = true;
            }
            else
            {
                this.fill_linear_array_text('compiler-other-options',flags[idx])
            }
        }
    }
    //ok
    linker_output_flags(flags)
    {
        var elemen =  document.getElementById('linker-malloc');
        elemen.selectedIndex = elemen.options['linker-malloc-ps-standard'].index;

        elemen =  document.getElementById('linker-dead-code');
        elemen.checked = false;

        elemen = document.getElementById('linker-other-options');
        elemen.textContent = "";

        for(var idx in flags)
        {
            if(flags[idx].toString().localeCompare('Wl,--gc-sections') == 0)
            {
                elemen =  document.getElementById('linker-dead-code');
                elemen.checked = true;
            }
            else if(flags[idx].toString().localeCompare('Wl,--defsym=malloc_getpagesize_P=0x80') == 0)
            {
                elemen =  document.getElementById('linker-malloc');
                elemen.selectedIndex = elemen.options['linker-malloc-ps-small'].index;
            }
            else if(flags[idx].toString().localeCompare('Wl,--defsym=malloc_getpagesize_P=0x1000') == 0)
            {
                elemen =  document.getElementById('linker-malloc');
                elemen.selectedIndex = elemen.options['linker-malloc-ps-standard'].index;
            }
            else
            {
                this.fill_linear_array_text('linker-other-options',flags[idx])
            }
        }
    }

    get_selected_item(id)
    {
        var index = document.getElementById(id).selectedIndex;
        var elem = document.getElementById(id).options;

        return elem[index].text;
    }

    get_item(id)
    {
        var item = document.getElementById(id).textContent;
        return item;
    }

    get_array_item(id,sep)
    {
        console.log(id);
        console.log(document.getElementById(id));
        var items = document.getElementById(id).textContent.split(sep);
        console.log('ID:' + id + " item:" + items);
        var item_filtered = items.filter(function(element,index,array){
            return element.localeCompare("") != 0;
        });
        console.log('ID:' + id + " item:" + item_filtered);
        return item_filtered;
    }

    get_flags_by_id(id,obj)
    {
        var index = document.getElementById(id).selectedIndex;
        var elem = document.getElementById(id).options;

        if(elem[index].getAttribute('flags-value').localeCompare('') !=0)
        {
            obj.push(elem[index].getAttribute('flags-value'));
        }
        return;
    }

    get_general_flags()
    {
        var items=[];
        this.get_flags_by_id('library-list',items);
        this.get_flags_by_id('mcpu-type',items);
        this.get_flags_by_id('instruction-set',items);
        this.get_flags_by_id('fpu-type',items);
        this.get_flags_by_id('fpu',items);
        
        var elem = document.getElementById('pipe-compiler');
        
        if(elem.checked == true)
        {
            items.push('pipe');
        }

        return items;
    }

    get_assembler_ouput_flags()
    {
        var items= this.get_array_item('assembler-other-options',' ');
        
        var elem = document.getElementById('assembler-suppress-warn');
        
        if(elem.checked == true)
        {
            items.push('Wa,--no-warn');
        }
        else
        {
            items.push('Wa,--warn');
        }

        elem = document.getElementById('preprocess-assembler');
        if(elem.checked == true)
        {
            items.push('x assembler-with-cpp');
        }

        this.get_flags_by_id('assembler-debug-level',items);


        return items;
    }

    get_compiler_output_flags()
    {
        var items= this.get_array_item('compiler-other-options',' ');

        var elem = document.getElementById('compiler-rm-dead-code');
        if(elem.checked == true)
        {
            items.push('ffunction-sections');
        }

        elem = document.getElementById('compiler-rm-dead-data');
        if(elem.checked == true)
        {
            items.push('fdata-sections');
        }

        this.get_flags_by_id('compiler-optimization',items);
        this.get_flags_by_id('c-std',items);
        this.get_flags_by_id('compiler-debug-level',items);


        return items;
    }

    get_linker_output_flags()
    {
        var items= this.get_array_item('linker-other-options',' ');

        var elem = document.getElementById('linker-dead-code');
        if(elem.checked == true)
        {
            items.push('Wl,--gc-sections');
        }

        this.get_flags_by_id('linker-malloc',items);

        return items;
    }
}

const ui = new UI();

