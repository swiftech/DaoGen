# DaoGen
DAO generator for Java persistence 

基于Node.js实现的Java持久层代码生成器，操作简单依赖少，可自定义模版生成任意DAO框架的Java代码（默认模版支持Hibernate）

##依赖：
依赖于Node.js以及ejs模版引擎

##安装：
安装最新版本的Node.js（目前稳定版本为4.x）

##使用方法：
1. 修改Template下的mapping文件，设置您自己的DAO接口，DAO实现类，DAO实体的通用父类（默认是基于SwiftDao的），以及实体类和DAO接口的包名。
2. （有必要的话）按照您的要求修改Template下的几个后缀为.java的模版文件。
3. 在任意地方建立一个文件夹 src，这里放置所有表的定义文件。
4. 在src文件夹中建立一个以实体类名为文件名的表定义文件，例如：SysUserEntity
5.   编辑表定义文件，按照以下格式编写：
  * 第一行：表名，例如 SYS_USER
  * 第二行：表的描述信息
  * 第三行：第一个字段的名字，例如：ID
  * 第四行：第一个字段的类型和长度，例如：VARCHAR(32)，目前支持的类型有：CHAR，VARCHAR，INT，LONG，SMALLINT，DECIMAL
  * 第五行：第一个字段的描述
  * 后面按照第三行至第五行的方法定义其他字段即可
6. 重复步骤5定义其他表
7. 运行程序生成代码：
```
  nodejs gen_dao.js src/ dst/
```
  其中 src/ 是前面放置表定义的地方，dst/是最终生成代码的文件夹
