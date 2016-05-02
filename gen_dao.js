// Usage: node gen_java_node.js <source folder name> <target folder name> <entity package name> <dao package name>
// <source folder name>: Include files each for a table.
// <target folder name>: To store generated java class files.
// <package name>: Pakcage name for java class
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

var decoder = new StringDecoder('utf8');

//　换行符
var LINE_SEP = '\n';

if (process.argv.length < 4) {
  console.log('Usage: node gen_dao.js <source folder name> <target folder name> <entity package name> <dao package name>');
  return;
}

var arg_src_folder = process.argv[2];
var arg_target_folder = process.argv[3];
// var arg_pkg_name_entity = process.argv[4];
// var arg_pkg_name_dao = process.argv[5];

console.log(arg_src_folder);
console.log(arg_target_folder);
// console.log(arg_pkg_name_entity);
// console.log(arg_pkg_name_dao);

var mappingSrc = readFileToString('template/mapping');
var mapping = JSON.parse(mappingSrc);
console.log(mapping);

fs.readdir(arg_src_folder, function (err, files) {
  if (err || !files || files.length == 0) {
    console.log('No mapping files for DB');
    return;
  }
  for (var i = 0; i < files.length; i++) {
    var fileName = files[i];
    if (fileName.indexOf('.') == 0) {
      continue;
    }
    var className = fileName;
    console.log('Read definition file: ' + fileName);
    var fileData = fs.readFileSync(arg_src_folder + '/' + fileName);
    handleMapping(className, fileData);
  }
});

/**
 * 处理一个映射文件中的元数据，生成实体类文件
 * @param className
 * @param data
 */
function handleMapping(className, data) {
  if (!data) {
    console.log('  failed to load file');
  }
  else {
    var bytes = new Buffer(data);
    var str = decoder.write(bytes).trim();
    //console.log(str);
    var lines = str.split(LINE_SEP);
    console.log('### ' + lines.length % 3 == 2); // 必须是 3*n+2 行
    if (!lines || lines.length == 0 || lines.length % 3 != 2) {
      console.log('  column definition invalid');
      return;
    }
    var colDefs = []; // 字段定义
    var tableName = lines[0];
    var entityDesc = lines[1];
    for (var j = 2; j < lines.length; j++) {
      var colDef = {};
      console.log(colDef);
      colDef.name = getColName(lines[j]);
      colDef.unique = lines[j].indexOf('*') > 0;
      colDef.notnull = lines[j++].indexOf('#') > 0;
      colDef.type = getType(lines[j]);
      colDef.length = getLength(lines[j++], colDef.type);
      colDef.comment = lines[j];
      console.log(colDef);
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
 */
function genJpaEntity(className, tbName, columns, entityDesc) {
  console.log();
  console.log('==== Create JPA Entity Class for Table "%s" ====', tbName);

  var colValues = {};
  colValues = Object.assign(colValues, mapping);
  // colValues.entity_pkg_name = arg_pkg_name_entity;
  colValues.entity_name = className;
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
      var precise = colDef.length.substring(0, colDef.length.indexOf(','));
      var scale = colDef.length.substring(colDef.length.indexOf(',', colDef.length.indexOf(')')));
      content += ', precision = ' + precise + ', scale = ' + scale;
    }
    else if(colDef.type != 'INT' && colDef.type != 'LONG' && colDef.type != 'SMALLINT') {
      content += ', length = ' + colDef.length;
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
    else {
      console.log('  WARN: Unrecognizable column type: %s, treat as String', type);
    }
    colValue.type = type;
    colValue.property_name = convertUnderLineToCamelSentence(colDef.name, true);
    colValue.property_method_name = convertUnderLineToCamelSentence(colDef.name, false);

    console.log(colValue);

    colValues.col_defs.push(colValue);
  }

  console.log('转换结果:');
  console.log(colValues);
  for(var i=0;i<colValues.length;i++) {
    console.log(colValues[i]);
  }

  var javaCode;
  var templateSrc = readFileToString('template/entity_template.java');
  if (!templateSrc || templateSrc.length == 0) {
    console.log('实体类模版没有找到');
    return;
  }

  var template = ejs.compile(templateSrc, {compileDebug: true, rmWhitespace: false});
  javaCode = template(colValues);

  var dstDir = arg_target_folder + '/entity/';
  if (!fs.existsSync(dstDir)) {
    fs.mkdirSync(dstDir);
  }

  fs.writeFile(dstDir + className + '.java', javaCode);
}

/**
 *
 */
function readFileToString(filePath) {
  var data = fs.readFileSync(filePath);
  var bytes = new Buffer(data);
  return decoder.write(bytes).trim();
}

/**
 * entityName 必须以’Entity‘结尾
 *
 */
function genJpaDaoInterfaceAndImpl(entityName, entityDesc) {
  console.log();
  console.log('==== Create JPA Dao Interface for Entity "%s" ====', entityName);


  var daoName = replaceTail(entityName, 'Entity', 'Dao');

  var params = {};
  params = Object.assign(params, mapping);
  // params.dao_pkg_name = arg_pkg_name_dao;
  // params.entity_pkg_name = arg_pkg_name_entity;
  params.dao_name = daoName;
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

  fs.writeFile(arg_target_folder + daoName + '.java', javaCode);

  // 生成 DAO 实现类
  console.log();
  console.log('==== Create JPA Dao Interface for Entity "%s" ====', entityName);
  // var daoImplName = replaceTail(entityName, 'Entity', 'DaoImpl');

  var templateSrc = readFileToString('template/dao_template.java');

  var template = ejs.compile(templateSrc, {compileDebug: true, rmWhitespace: false});
  javaCode = template(params);

  var dstDir = arg_target_folder + 'impl/';
  if (!fs.existsSync(dstDir)) {
    fs.mkdirSync(dstDir);
  }

  fs.writeFile(arg_target_folder + 'impl/' + daoName + 'Impl.java', javaCode);

}

function genJpaDaoInterface(entityName) {

}

/**
 * 将字符串尾部的内容替换掉
 *
 */
function replaceTail(str, old, replacement) {
  var n = str.lastIndexOf(old);
  if (n <=0 ) {
    console.log('No specified tail found');
    return str;
  }
  console.log(n);
  console.log(str.substring(0, n) );
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
