// Usage: node gen_dao.js exec <source folder name> <target folder name>
// <source folder name>: Include files each for a table.
// <target folder name>: To store generated java class files.
// 映射文件格式：
// 1# DB表名
// 2# 第一个字段名 + 空格 +  如果后面跟一个 # 号表示字段非空，跟一个 * 号表示字段唯一
// 3# 第一个字段类型和长度
// 4# 第一个字段的说明
// 5# 重复2-3的内容

var fs = require('fs');
var util = require('util');
var StringDecoder = require('string_decoder').StringDecoder;
var ejs = require('ejs');
var program = require('commander');
var decoder = new StringDecoder('utf8');

console.log('DAO generator for Java persistence ')

//　换行符
var LINE_SEP = '\n';
var arg_src_folder = process.argv[2];
var arg_target_folder = process.argv[3];
var is_verbose = false;


program.version('1.0')
  .option('-v, --verbose', 'show verbose log')
  .command('exec <src> <dst>')
  .action(function(src, dst) {
    console.log(program.verbose);
    if (program.verbose) {
      console.log("verbose mode");
    }
    else {
      console.log("silent mode");
    }
    console.log(src);
    console.log(dst);
    arg_src_folder = src;
    arg_target_folder = dst;
    is_verbose = program.verbose;
    console.log(arg_src_folder);
    execGeneration();
  });

program.parse(process.argv);

// if (process.argv.length < 4) {
//   console.log('Usage: node gen_dao.js <source folder name> <target folder name>');
//   return;
// }
//
// var arg_src_folder = process.argv[2];
// var arg_target_folder = process.argv[3];

var mapping;

function execGeneration() {
  console.log('Starting generator');
  info(arg_src_folder);
  info(arg_target_folder);

  var mappingSrc = readFileToString('template/mapping');
  mapping = JSON.parse(mappingSrc);
  info(mapping);

  fs.readdir(arg_src_folder, function (err, files) {
    if (err || !files || files.length == 0) {
      info('No mapping files for DB');
      return;
    }
    for (var i = 0; i < files.length; i++) {
      var fileName = files[i];
      if (fileName.indexOf('.') == 0) {
        continue;
      }
      var className = fileName;
      info('Read definition file: ' + fileName);
      var fileData = fs.readFileSync(arg_src_folder + '/' + fileName);
      handleMapping(className, fileData);
    }
  });
}


/**
 * 处理一个映射文件中的元数据，生成实体类文件
 * @param className
 * @param data
 */
function handleMapping(className, data) {
  if (!data) {
    info('  failed to load file');
  }
  else {
    var bytes = new Buffer(data);
    var str = decoder.write(bytes).trim();
    //console.log(str);
    var lines = str.split(LINE_SEP);
    debug('### ' + lines.length % 3 == 2); // 必须是 3*n+2 行
    if (!lines || lines.length == 0 || lines.length % 3 != 2) {
      info('  column definition invalid');
      return;
    }
    var colDefs = []; // 字段定义
    var tableName = lines[0];
    var entityDesc = lines[1];
    for (var j = 2; j < lines.length; j++) {
      var colDef = {};
      debug(colDef);
      colDef.name = getColName(lines[j]);
      colDef.unique = lines[j].indexOf('*') > 0;
      colDef.notnull = lines[j++].indexOf('#') > 0;
      colDef.type = getType(lines[j]);
      colDef.length = getLength(lines[j++], colDef.type);
      colDef.comment = lines[j];
      debug(colDef);
      colDefs.push(colDef);
    }

    genJpaEntity(className, tableName, colDefs, entityDesc);

    genJpaDaoInterfaceAndImpl(className, entityDesc);

  }
}

function getColName(str) {
  if (str.indexOf(' ') <= 0) {
    return str;
  }
  else {
    return str.substring(0, str.indexOf(' '));
  }
}

function getType(str) {
  var idx = str.indexOf('(');
  return str.substring(0, idx <= 0 ? str.length : idx);
}

function getLength(str, type) {
  if (str.indexOf('(') <= 0) {
    return 0;// 无长度
  }
  // decimal 特殊处理
  if (type == 'DECIMAL') {
    var idx1 = str.indexOf('(');
    var idx2 = str.indexOf(')');
    return str.substring(idx1 + 1, idx2);
    //return 12; // TODO 暂时固定为14，将来重构成可以自动计算长度
  }
  else {
    return str.substring(str.indexOf('(') + 1, str.indexOf(')'));
  }
}

/**
 * 生成 JPA 定义的实体类
 * @param className 实体类名
 * @param tbName 表名
 * @param columns 字段定义
 * @param entityDesc
 */
function genJpaEntity(entityClassName, tbName, columns, entityDesc) {
  info();
  info('==== Create JPA Entity Class for Table "%s" ====', tbName);

  var colValues = {};
  colValues = Object.assign(colValues, mapping);
  // colValues.entity_pkg_name = arg_pkg_name_entity;
  colValues.entity_class_name = entityClassName;
  colValues.table_name = tbName;
  colValues.entity_desc = entityDesc;
  colValues.col_defs = [];// init

  for (var j = 0; j < columns.length; j++) {
    var colDef = columns[j];
    var colValue = {};

    colValue.name = colDef.name;

    // 注释
    if (colDef.comment) {
      colValue.comment = util.format('%s', colDef.comment);
    }

    // 注解
    colValue.annotations = [];
    if (colDef.name == 'ID') {
      colValue.annotations.push('@Id()');
    }

    var content = '';
    content += util.format('@Column(name = COL_NAME_%s', colDef.name);

    if (colDef.type == 'DECIMAL') {
      var iSeperator = colDef.length.indexOf(',');
      console.log(colDef.length);
      var precise = colDef.length.substring(0, iSeperator);
      var scale = colDef.length.substring(iSeperator + 1, colDef.length.length);
      content += ', precision = ' + precise + ', scale = ' + scale;
    }
    else if(colDef.type != 'INT' && colDef.type != 'LONG' && colDef.type != 'SMALLINT') {
      content += ', length = ' + colDef.length;
      if (colDef.type == 'CHAR') {
        content += ', columnDefinition = "char(' + colDef.length + ')"';
      }
    }

    if (colDef.unique) {
      content += ', unique = true';
    }
    if (colDef.notnull) {
      content += ', nullable = false';
    }
    content += ')';
    colValue.annotations.push(content);

    // 成员变量定义
    var type = 'String';
    if (colDef.type == 'INT' || colDef.type == 'SMALLINT') {
      type = 'int';
    }
    else if (colDef.type == 'LONG') {
      type = 'long';
    }
    else if (colDef.type == 'DECIMAL') {
      type = 'BigDecimal';
    }
    else if(colDef.type == 'CHAR' || colDef.type == 'VARCHAR') {
      type = 'String';
    }
    else {
      info('  WARN: Unrecognizable column type: %s, treat as String', colDef.type);
    }
    colValue.type = type;
    colValue.property_name = convertUnderLineToCamelSentence(colDef.name, true);
    colValue.property_method_name = convertUnderLineToCamelSentence(colDef.name, false);

    debug(colValue);

    colValues.col_defs.push(colValue);
  }

  debug('转换结果:');
  debug(colValues);
  for(var i=0; i<colValues.length; i++) {
    debug(colValues[i]);
  }

  var javaCode;
  var templateSrc = readFileToString('template/entity_template.java');
  if (!templateSrc || templateSrc.length == 0) {
    info('实体类模版没有找到');
    return;
  }

  var template = ejs.compile(templateSrc, {compileDebug: true, rmWhitespace: false});
  javaCode = template(colValues);

  var dstDir = arg_target_folder + '/entity/';
  if (!fs.existsSync(dstDir)) {
    fs.mkdirSync(dstDir);
  }

  var dstFilePath = dstDir + entityClassName + '.java';
  fs.writeFile(dstFilePath, javaCode);

  info('==== Done with file %s created ====', dstFilePath);
}

/**
 * 读取文本文件内容
 */
function readFileToString(filePath) {
  var data = fs.readFileSync(filePath);
  var bytes = new Buffer(data);
  return decoder.write(bytes).trim();
}

/**
 * 生成 DAO 接口和实现类
 * @param entityName 必须以’Entity‘结尾
 * @param entityDesc
 */
function genJpaDaoInterfaceAndImpl(entityClassName, entityDesc) {
  info();
  info('==== Create JPA Dao Interface for Entity "%s" ====', entityName);


  var daoName = replaceTail(entityClassName, 'Entity', 'Dao');
  var entityName = replaceTail(entityClassName, 'Entity', '');

  var params = {};
  params = Object.assign(params, mapping);
  // params.dao_pkg_name = arg_pkg_name_dao;
  // params.entity_pkg_name = arg_pkg_name_entity;
  params.dao_name = daoName;
  params.entity_class_name = entityClassName;
  params.entity_name = entityName;
  params.dao_desc = entityDesc;

  var templateSrc = readFileToString('template/dao_template.java');

  var template = ejs.compile(templateSrc, {compileDebug: true, rmWhitespace: false});
  javaCode = template(params);
  // var template2 = ejs.compile(javaCode, {compileDebug: true, rmWhitespace: false});
  // var javaCode2 = template2(mapping);

  var dstDir = arg_target_folder;
  if (!fs.existsSync(dstDir)) {
    fs.mkdirSync(dstDir);
  }

  var dstDaoFilePath = arg_target_folder + daoName + '.java';
  fs.writeFile(dstDaoFilePath, javaCode);

  info('==== Done with file %s created ====', dstDaoFilePath);

  // 生成 DAO 实现类
  info();
  info('==== Create JPA Dao Interface for Entity "%s" ====', entityName);
  // var daoImplName = replaceTail(entityName, 'Entity', 'DaoImpl');

  var templateSrc = readFileToString('template/dao_impl_template.java');

  var template = ejs.compile(templateSrc, {compileDebug: true, rmWhitespace: false});
  javaCode = template(params);

  var dstDir = arg_target_folder + 'impl/';
  if (!fs.existsSync(dstDir)) {
    fs.mkdirSync(dstDir);
  }

  var dstDaoImplFilePath = arg_target_folder + 'impl/' + daoName + 'Impl.java';
  fs.writeFile(dstDaoImplFilePath, javaCode);

  info('==== Done with file %s created ====', dstDaoImplFilePath);

}

/**
 * 将字符串尾部的内容替换掉
 *
 */
function replaceTail(str, old, replacement) {
  var n = str.lastIndexOf(old);
  if (n <=0 ) {
    debug('No specified tail found');
    return str;
  }
  debug(n);
  debug(str.substring(0, n) );
  return str.substring(0, n) + replacement;
}


/**
 * 将下划线句子转换为驼峰
 * @param sentence
 * @param firstLowerCase 第一个字母是否小写，默认为false
 */
function convertUnderLineToCamelSentence(sentence, firstLowerCase) {
  var words = sentence.split('_');
  if (!words || words.length == 0) {
    return sentence;
  }
  var ret = '';
  var start = 0;
  if (firstLowerCase) {
    ret = words[0].toLowerCase(); // 第一个特殊处理
    start = 1; // 从第二个开始
  }
  for (var i = start; i < words.length; i++) {
    ret += words[i].charAt(0).toUpperCase(); // 第一个大写
    ret += words[i].substring(1).toLowerCase(); // 后面全部小写
  }
  return ret;
}

function debug(str) {
  if (is_verbose && str) {
    console.log(str);
  }
}

function info(str) {
  if (str) {
    console.log(str);
  }
}

function info(str, value) {
  if (str) {
    console.log(str, value);
  }
}
