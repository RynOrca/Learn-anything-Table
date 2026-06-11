# python 学习计划

> **创建日期**: 2026-06-11
> **起点**: 零基础
> **目标**: 系统掌握 python 核心知识与实践能力

---

## 阶段一：基础语法与数据结构

> 目标：熟练操作 Python 核心数据类型，能独立写出数据处理逻辑

### 1.1 变量与数据类型
- 理解动态类型、可变与不可变对象、数字类型、布尔类型和 None 的概念

### 1.2 运算符与表达式
- 掌握算术、比较、逻辑、位运算、身份和成员运算符的用法

### 1.3 条件与循环
- 学习 if/elif/else 分支、for/while 循环以及 break/continue/pass 控制

### 1.4 列表与元组
- 掌握创建、增删改查、切片、排序和元组解包操作

### 1.5 字典与集合
- 理解哈希表原理，掌握字典和集合的增删改查及运算

### 1.6 字符串处理
- 学习字符串不可变性、f-string 格式化、常用方法和 Unicode 编码

### 1.7 推导式与生成器
- 掌握列表/字典/集合推导式、生成器表达式和 yield 关键字

### 1.8 切片与迭代器
- --

---

## 阶段二：函数与面向对象

> 目标：写出结构清晰、可复用的代码，理解 Python 对象模型

### 2.1 函数定义与参数
- 学习位置参数、关键字参数、*args/**kwargs 和函数注解

### 2.2 作用域与闭包
- 掌握 LEGB 规则、global/nonlocal 关键字和闭包原理

### 2.3 Lambda 与高阶函数
- 理解 lambda 表达式、map/filter/reduce 和函数作为一等公民

### 2.4 装饰器
- 学习装饰器语法、带参数装饰器、functools.wraps 和常见内置装饰器

### 2.5 类与实例
- 掌握 __init__、self、类变量与实例变量、方法类型和 __slots__

### 2.6 继承与多态
- 理解单继承、多重继承、MRO、super() 和鸭子类型

### 2.7 魔术方法
- 学习 __str__、__eq__、__len__、__add__ 等魔术方法的实现

### 2.8 属性与描述符
- --

---

## 阶段三：内置函数与标准库

> 目标：精通 Python 内置工具箱，能用最小代码量解决常见问题

### 3.1 内置函数全览
- 学习 len、type、isinstance、id、hash 等数据操作函数

### 3.2 数学与类型转换
- 掌握 abs、round、pow、bin、int 等计算和转换函数

### 3.3 迭代与聚合
- 学习 enumerate、zip、sorted、any、all 等迭代工具

### 3.4 collections 模块
- 掌握 namedtuple、defaultdict、Counter、deque 等数据结构

### 3.5 itertools 模块
- 学习 count、cycle、product、permutations 等迭代器工具

### 3.6 functools 模块
- 掌握 lru_cache、partial、reduce、singledispatch 等高阶函数

### 3.7 时间与正则
- 学习 datetime、time、re 模块的核心用法

### 3.8 文件与路径
- --

---

## 阶段四：工程化开发

> 目标：具备独立构建、测试、发布 Python 项目的能力

### 4.1 虚拟环境与包管理
- 学习 venv、pip 和 pyproject.toml 配置管理

### 4.2 import 系统与包结构
- 掌握绝对/相对导入、__init__.py 和 sys.path

### 4.3 异常处理
- 学习 try/except/else/finally、异常链和自定义异常

### 4.4 上下文管理器
- 掌握 with 语句、__enter__/__exit__ 和 contextlib 模块

### 4.5 类型注解系统
- 学习基础标注、Optional、Union、TypeVar 和 mypy 检查

### 4.6 dataclass 与数据建模
- 掌握 @dataclass、field() 和 NamedTuple 的使用

### 4.7 单元测试
- 学习 pytest 基础、fixture、参数化测试和 Mock

### 4.8 日志与调试
- --

---

## 阶段五：常用库与 GUI

> 目标：能使用 Python 常用库解决实际问题和开发简单 GUI 应用

### 5.1 数据科学基础
- 学习 NumPy 数组操作和 Pandas 数据处理

### 5.2 数据可视化
- 掌握 Matplotlib 和 Seaborn 的基本图表绘制

### 5.3 网络请求
- 学习 requests 库的 GET/POST 请求和响应处理

### 5.4 网页爬虫
- 掌握 BeautifulSoup 和 Scrapy 的基础爬虫开发

### 5.5 数据库操作
- 学习 sqlite3 和 SQLAlchemy 的基本使用

### 5.6 GUI 编程
- 掌握 Tkinter 或 PyQt 的基础控件和布局

### 5.7 多线程与异步
- --

---

## 阶段六：深度学习入门

> 目标：理解深度学习基本概念，能使用框架搭建简单模型

### 6.1 深度学习基础
- 学习神经网络、激活函数和反向传播原理

### 6.2 TensorFlow 入门
- 掌握 TensorFlow 的基本张量操作和模型构建

### 6.3 PyTorch 入门
- 学习 PyTorch 的张量、自动求导和简单网络

### 6.4 图像分类
- 使用 CNN 实现图像分类任务

### 6.5 自然语言处理
- 学习词嵌入、RNN 和简单文本分类

### 6.6 模型训练与评估
- 掌握训练循环、损失函数、优化器和评估指标

### 6.7 迁移学习
- 学习使用预训练模型进行微调
