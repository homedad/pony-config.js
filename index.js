// Pony Config Configuration Module
//
// (c) 2014 PonyCode Corporation
// License to distribute freely
//
// TODO
// log when set dot-path is extending objects
// allow a key path for where a file or object is loaded
// add debug mode to trace key overwrites (probably requires rewriting 'defaults')
// load configuration from command line parameters
// ------------------------------------------------------

( function(){

    // ----------------------------
    // External dependencies
    // ----------------------------
    var fs = require('fs');

    // ----------------------------
    // Local dependencies
    // ----------------------------
    var env = require('./lib/env');
    var argv = require('./lib/argv');
    var Config = require('./lib/Config');
    var arrayWrap = require('./lib/array-wrap');

    // ----------------------------
    // Configuration State, Module-Global by design
    // ----------------------------
    var _config = new Config();
    var _options = {};
    var _environment = false;               // by default no environment is selected
    var _whenEnvironments = false;
    var _parsedArgs = [];

    function _reset( options ){
        _config = new Config();
        _options = {};
        _environment = false;
        _whenEnvironments = false;
        _parsedArgs = [];
        if( options && options.arguments ){
            _options._debugOverrideCommandlineArgs = options.arguments;
        }
    }


    // ----------------------------
    // Options:
    //  debug - logs configuration changes
    // ----------------------------
    function _setOptions( options ){
        _options = options || {};
        return this;
    }

    // ----------------------------
    // Environment Switching:
    // Ignores config settings that aren't for the current environment
    // ----------------------------

    function _findEnvironment( search ){
        _environment = env.search( search );
        return this;
    }

    function _useEnvironment( environment ){
        _environment = environment;
        return this;
    }

    function _getEnvironment(){
        return _environment;
    }

    function _shouldApplyConfig( environments ){

        if( environments === undefined || environments === false ) return true; // unspecified environments are always added

        environments = arrayWrap.wrap( environments );

        for( var i = 0; i < environments.length; i++){
            var env = environments[i];
            if( env === _environment ){
                return true;
            }
        }

        return false;
    }

    // ----------------------------
    // When Clause - use to set environment context for useX commands
    // ----------------------------
    function _when( environments ){
        _whenEnvironments = environments;
        return this;
    }

    // ----------------------------
    // Always Clause - use to set environment context for useX commands
    // ----------------------------
    function _always(){
        _whenEnvironments = false;
        return this;
    }


    // ----------------------------
    // USE Clauses - Configuration sources
    // ----------------------------



    // ----------------------------
    // Set configuration from a file
    // ----------------------------
    function _useFile( configFileName ){
        if( _shouldApplyConfig( _whenEnvironments ) ){
            _loadAndApplyConfigFile( configFileName );
        }
        _whenEnvironments = false;
        return this;
    }

    // ----------------------------
    // Set configuration from an OS environment variable
    // ----------------------------
    function _useEnvironmentVar( key, envVariableName ){
        if( _shouldApplyConfig( _whenEnvironments ) && process.env[ envVariableName ] !== undefined ){
            _config.set( key, process.env[ envVariableName ]);
        }
        _whenEnvironments = false;
        return this;
    }

    // ----------------------------
    // Set configuration from the command line
    // ----------------------------
    function _useCommandLineArguments( usageRules ){
        if( _shouldApplyConfig( _whenEnvironments ) ){

            var options = {};
            if( _options._debugOverrideCommandlineArgs ){
                options = { "arguments" : _options._debugOverrideCommandlineArgs };
            }

            var interpreter = new argv.Interpreter( usageRules, options );
            _parsedArgs = interpreter.args;

            usageRules = arrayWrap.wrap( usageRules );
            for( var i=0; i < usageRules.length; i++ ){
                var path = usageRules[i].path;
                var value = interpreter.values[ path ];
                if( value ){
                    _config.set( path, value, 'USE-COMMAND-LINE:' + usageRules[i].options );
                }
            }
        }
        _whenEnvironments = false;
        return this;
    }

    // ----------------------------
    // Set configuration using an object
    // ----------------------------
    function _useObject( configData ){
        if( _shouldApplyConfig( _whenEnvironments ) ){
            _config.set( '.', configData, 'USE-OBJECT' );
        }
        _whenEnvironments = false;
        return this;
    }

    // ----------------------------
    // Log the current configuration
    // ----------------------------
    function _list(){
        console.log('------------------------------------');
        if( _environment ) {
            console.log('CONFIG: [' + _environment + ']');
        }else{
            console.log('CONFIG:');
        }
        _config.list();
        console.log('------------------------------------');
        return this;
    }

    // ----------------------------
    // Set configuration using an dot-path key, eg. (tree.height, 25)
    // ----------------------------
    function _set( configKeyPath, configValue ){
        _config.set( configKeyPath, configValue, 'SET' );
        return this;
    }

    // ----------------------------
    // Get config with a dot-path key, e.g., get( tree.height )
    // ----------------------------
    function _get( configKeyPath, defaultValue ){
        return _config.get( configKeyPath, defaultValue );
    }


    // ----------------------------
    // Helper to parse a config file
    // ----------------------------
    function _loadAndApplyConfigFile( configFileName ){
        var configFileData = false;

        try{
            var configFileContents = fs.readFileSync( configFileName, { 'encoding' : 'utf8' } );
            configFileData = JSON.parse( configFileContents );
            if( _options.debug ) console.log('CONFIG: [' + _environment + '] Loaded config from file:', configFileName );
        } catch( error ){
            if( error.code !== 'ENOENT' ){		// file doesn't exist, skip it
                console.error('CONFIG: Error reading file:', configFileName, error );
            }
        }

        if( configFileData ){
            _config.set( '.', configFileData, 'USE-FILE:' + configFileName );
        }
    }


    // ----------------------------
    // Expose public functions
    // ----------------------------
    exports.setOptions = _setOptions;
    exports.findEnvironment = _findEnvironment;
    exports.getEnvironment = _getEnvironment;
    exports.useEnvironment = _useEnvironment;
    exports.when = _when;
    exports.always = _always;
    exports.useFile = _useFile;
    exports.useObject = _useObject;
    exports.useEnvironmentVar = _useEnvironmentVar;
    exports.useCommandLineArguments = _useCommandLineArguments;
    exports.get = _get;
    exports.set = _set;
    exports.list = _list;
    exports.reset = _reset;
    exports.parsedArgs = _parsedArgs;

})();
