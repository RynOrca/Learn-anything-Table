# Python 体系化学习计划

> **创建日期**: 2026-06-11
> **起点**: 数据结构 → 列表与元组（已讲解，待练习）
> **目标**: 从基础到精通，覆盖 6 大阶段、52 个知识点

---

## 学习路线图

```
阶段1          阶段2           阶段3            阶段4          阶段5          阶段6
基础语法+      函数与          内置函数与        工程化开发      常用库+        深度学习
数据结构    →  面向对象    →   标准库       →               →   GUI       →
  (8)           (8)            (10)             (9)            (10)           (7)
```

每个知识点采用三步法：**讲解(explain) → 练习(practice) → 复习(review)**

---

## 阶段一：基础语法 + 数据结构（8 个知识点）

> 目标：熟练操作 Python 核心数据类型，能独立写出数据处理逻辑

### 1.1 列表与元组 🔄 `in_progress`
- [ ] 练习 `/learn:practice 列表与元组`
- [ ] 回顾 Socratic 问题（可变对象陷阱、切片反转、append vs extend）
- 内容：创建、增删改查、切片、排序、元组解包、应用场景

### 1.2 字典与集合
- 字典：哈希表原理、增删改查、`get()`/`setdefault()`、字典推导式
- 集合：去重、交集/并集/差集、集合运算、frozenset
- 对比：列表 vs 字典 vs 集合的查询复杂度（O(n) vs O(1) vs O(1)）

### 1.3 推导式与生成器
- list/dict/set comprehension 语法与嵌套
- 生成器表达式 `(x for x in ...)` vs 列表推导式的内存差异
- `yield` / `yield from`、生成器函数
- 惰性求值（lazy evaluation）概念

### 1.4 切片与迭代器
- `slice` 对象、`slice(start, stop, step)`、多维切片
- `iter()` / `next()` 协议
- 自定义迭代器类（`__iter__` + `__next__`）
- `itertools` 预览

### 1.5 字符串处理
- 字符串不可变性
- f-string 格式化（对齐、填充、数字格式、日期格式）
- 常用方法：`split`/`join`/`strip`/`replace`/`find`/`startswith`/`endswith`
- Unicode 编码/解码（UTF-8、bytes ↔ str）
- 正则表达式预览

### 1.6 运算符与表达式
- 算术 `+ - * / // % **`、比较 `== != < > <= >=`、逻辑 `and or not`
- 位运算 `& | ^ ~ << >>`
- 身份运算符 `is` / `is not`（vs `==`）
- 成员运算符 `in` / `not in`
- 运算符优先级与结合性
- 短路求值（short-circuit evaluation）

### 1.7 条件与循环
- `if` / `elif` / `else` 分支
- `for` 循环（遍历列表、字典、字符串、range、enumerate、zip）
- `while` 循环与无限循环控制
- `break` / `continue` / `pass`
- `else` 子句在循环中的用法（`for...else` / `while...else`）

### 1.8 变量与数据类型深入
- 动态类型 vs 静态类型
- 可变对象 vs 不可变对象（内存模型与 `id()`）
- 浅拷贝 vs 深拷贝（`copy.copy` / `copy.deepcopy`）
- 数字类型细节：`int`（任意精度）、`float`（IEEE 754）、`complex`
- 布尔类型与真值测试（truthy/falsy）
- `None` 与 `is None` 惯用法

---

## 阶段二：函数与面向对象（8 个知识点）

> 目标：写出结构清晰、可复用的代码，理解 Python 对象模型

### 2.1 函数定义与参数
- 位置参数 / 关键字参数 / 仅限关键字参数（`*` 分隔符）
- 默认值陷阱（可变默认参数）
- `*args` 与 `**kwargs` 解包
- 函数注解（type hints）
- 文档字符串（docstring）

### 2.2 作用域与闭包
- LEGB 规则（Local → Enclosing → Global → Built-in）
- `global` / `nonlocal` 关键字
- 闭包原理与工厂函数
- 自由变量（free variable）与 `__closure__`

### 2.3 Lambda 与高阶函数
- lambda 表达式语法与限制
- `map()` / `filter()` / `reduce()` — 何时用、何时不用（推导式更 Pythonic）
- `sorted(key=...)` / `max(key=...)` / `min(key=...)`
- 一等公民：函数作为参数、返回值、数据结构的成员

### 2.4 装饰器
- 函数装饰器原理（`@decorator` 语法糖）
- 装饰器执行时机（导入时 vs 调用时）
- 带参数的装饰器（三层嵌套）
- `functools.wraps` 保留元信息
- 常见内置装饰器：`@staticmethod` / `@classmethod` / `@property`
- 实战：计时器装饰器、日志装饰器、缓存装饰器

### 2.5 类与实例
- `__init__` 与 `self` 的含义
- 类变量 vs 实例变量（共享 vs 独立）
- 方法类型：实例方法 / 类方法 / 静态方法
- `__slots__` 与内存优化
- 可见性约定：`_protected` / `__name_mangling`

### 2.6 继承与多态
- 单继承与多重继承
- MRO（Method Resolution Order）→ C3 线性化
- `super()` 的两种用法：`super()` / `super(Class, self)`
- Mixin 模式（多重继承的 Pythonic 用法）
- 鸭子类型（Duck Typing）vs 名义子类（ABC）

### 2.7 魔术方法
- 表示方法：`__str__` vs `__repr__` vs `__format__`
- 比较运算符：`__eq__` / `__lt__` / `__gt__` / `__hash__`
- 容器协议：`__len__` / `__getitem__` / `__setitem__` / `__contains__`
- 算术运算符重载：`__add__` / `__radd__` / `__iadd__`
- 可调用对象：`__call__`
- 上下文管理：`__enter__` / `__exit__`

### 2.8 属性与描述符
- `@property` — getter / setter / deleter
- 属性 vs 方法的取舍
- 描述符协议：`__get__` / `__set__` / `__delete__`
- 数据描述符 vs 非数据描述符的优先级
- 实战：类型验证描述符

---

## 阶段三：内置函数与标准库（10 个知识点）

> 目标：精通 Python 内置工具箱，能用最小代码量解决常见问题

### 3.1 内置函数全览（上）— 数据操作
- `len()` / `type()` / `isinstance()` / `issubclass()`
- `id()` / `hash()` / `dir()` / `vars()`
- `repr()` / `str()` / `ascii()` / `format()`
- `bytes()` / `bytearray()` / `memoryview()`
- `slice()` / `range()`
- `iter()` / `next()` / `reversed()`

### 3.2 内置函数全览（中）— 计算与转换
- **数学类**: `abs()` / `round()` / `pow()` / `divmod()` / `sum()` / `min()` / `max()`
- **进制转换**: `bin()` / `oct()` / `hex()` / `int(x, base)`
- **字符编码**: `ord()` / `chr()` / `ascii()`
- **类型转换**: `int()` / `float()` / `str()` / `list()` / `tuple()` / `dict()` / `set()` / `frozenset()` / `bool()` / `complex()`
- `callable()` / `compile()` / `eval()` / `exec()`（安全警告）

### 3.3 内置函数全览（下）— 迭代与聚合
- **迭代工具**: `enumerate()` / `zip()` / `map()` / `filter()` / `reversed()` / `sorted()`
- **聚合判断**: `any()` / `all()` / `max()` / `min()` / `sum()`
- **对象信息**: `hasattr()` / `getattr()` / `setattr()` / `delattr()`
- **其他**: `open()` / `input()` / `print()` / `help()`
- `__import__()` vs `import` 语句
- 实战：内置函数组合技巧（一行代码解决问题）

### 3.4 collections — 数据结构增强
- `namedtuple` — 轻量级数据类
- `defaultdict` — 自动初始化默认值
- `Counter` — 计数器，频次统计
- `deque` — 双端队列（appendleft/popleft O(1)）
- `OrderedDict` — 有序字典（Python 3.7+ dict 也保序）
- `ChainMap` — 多层映射组合
- `UserDict` / `UserList` / `UserString` — 可继承的容器包装类

### 3.5 itertools — 迭代器工具箱
- 无穷迭代器：`count()` / `cycle()` / `repeat()`
- 有限迭代器：`accumulate()` / `chain()` / `compress()` / `dropwhile()` / `takewhile()`
- 组合迭代器：`product()` / `permutations()` / `combinations()` / `combinations_with_replacement()`
- `groupby()` — 分组迭代（必须先排序！）
- `pairwise()` / `islice()` / `starmap()` / `tee()`

### 3.6 functools — 高阶函数工具
- `lru_cache` / `cache` — 函数结果缓存
- `partial` / `partialmethod` — 部分应用
- `reduce` — 累积归约（从 Python 2 的内置函数移入）
- `wraps` — 装饰器元信息保留
- `total_ordering` — 自动补全比较运算符
- `singledispatch` / `singledispatchmethod` — 单分派泛型函数

### 3.7 时间、正则与数学
- **datetime**: `datetime` / `date` / `time` / `timedelta` / `timezone`
- **time**: 时间戳、`sleep()`、`perf_counter()`
- **re**: 正则表达式 — `search` / `match` / `findall` / `sub` / `compile`、贪婪 vs 非贪婪、捕获组与命名组
- **math**: `sqrt` / `ceil` / `floor` / `sin` / `cos` / `pi` / `e` / `log` / `log2` / `log10` / `gcd` / `lcm` / `perm` / `comb` / `isclose`
- **random**: `random` / `randint` / `choice` / `shuffle` / `sample` / `seed`

### 3.8 日志与调试
- `logging` 模块：Logger / Handler / Formatter / Filter 架构
- 日志级别：DEBUG / INFO / WARNING / ERROR / CRITICAL
- 日志输出到文件 vs 控制台
- `pdb` / `breakpoint()` 交互式调试
- `pprint` / `reprlib` 美化输出
- `traceback` 异常栈信息提取

### 3.9 文件、IO 与路径操作
- 文件读写：文本模式 vs 二进制模式、编码处理
- `with open(...)` 上下文管理
- `pathlib.Path` — 现代路径操作（`/` 运算符、`.glob()`、`.rglob()`）
- 文件系统遍历、创建/删除目录
- `tempfile` 临时文件模块

### 3.10 序列化与数据交换
- JSON: `json.dumps()` / `json.loads()` — 自定义 encoder/decoder
- CSV: `csv.reader` / `csv.DictReader` / `csv.writer`
- `pickle` — 对象序列化与安全警告
- `struct` — C 结构体打包/解包
- configparser / tomllib (Python 3.11+) — 配置文件解析

---

## 阶段四：工程化开发（9 个知识点）

> 目标：具备独立构建、测试、发布 Python 项目的能力

### 4.1 虚拟环境与包管理
- `venv` — 创建隔离环境、激活/退出
- `pip` — install / uninstall / freeze / list / show
- `pyproject.toml` 项目配置（setuptools / poetry / PDM）
- 依赖锁定：`requirements.txt` vs `poetry.lock`
- 版本约束：`==` / `>=` / `~=` / `^`

### 4.2 import 系统与包结构
- 绝对导入 vs 相对导入
- `__init__.py` — 包标识与命名空间包
- `__name__ == "__main__"` 惯用法
- `importlib` 动态导入
- `sys.path` 与模块搜索顺序
- 循环导入问题与解决方案

### 4.3 异常处理
- `try` / `except` / `else` / `finally` 完整语法
- 捕获多个异常、`except Exception as e`
- 异常链：`raise ... from ...`
- 自定义异常类（继承 `Exception`）
- 常见内置异常族谱（`BaseException` → `Exception` → ...）
- 何时捕获、何时让它崩（EAFP vs LBYL）

### 4.4 上下文管理器
- `with` 语句原理（`__enter__` + `__exit__`）
- `contextlib.contextmanager` 装饰器（基于生成器）
- `contextlib.closing` / `contextlib.suppress` / `contextlib.redirect_stdout`
- `contextlib.ExitStack` — 动态管理多个上下文
- 实战：数据库连接、文件锁、计时器上下文管理器

### 4.5 类型注解系统
- 基础标注：`int` / `str` / `list[int]` / `dict[str, int]`
- `Optional[X]` = `X | None`（Python 3.10+）
- `Union[X, Y]` = `X | Y`
- `Literal` / `Final` / `TypedDict` / `Protocol`
- `Callable[[Args], Return]`
- `TypeVar` / `Generic` — 泛型编程
- 类型检查工具：mypy / pyright
- `typing.overload` — 函数重载签名

### 4.6 dataclass 与数据建模
- `@dataclass` 自动生成 `__init__` / `__repr__` / `__eq__`
- `field()` — 默认值、默认工厂、排序/哈希控制
- `field(default_factory=...)` vs 可变默认值陷阱
- `dataclasses.asdict()` / `astuple()`
- `NamedTuple` vs `dataclass` vs `pydantic.BaseModel` — 何时用哪个

### 4.7 单元测试
- pytest 基础：`test_*.py` / `test_*` 函数、assert 断言
- fixture — 测试前置/后置（setup/teardown）
- 参数化测试 `@pytest.mark.parametrize`
- Mock：`unittest.mock.Mock` / `patch` / `pytest-mock`
- 测试覆盖率：`pytest-cov` / `coverage.py`
- TDD 红-绿-重构循环

### 4.8 异步编程
- 为什么需要 async：IO 密集型 vs CPU 密集型
- 协程（coroutine）：`async def` / `await`
- `asyncio.run()` — 事件循环入口
- `asyncio.gather()` / `asyncio.create_task()`
- `asyncio.wait_for()` / `asyncio.as_completed()`
- 异步上下文管理器（`async with`）与异步迭代器（`async for`）
- `aiofiles` / `aiohttp` — 异步文件/网络操作
- asyncio 与多线程/多进程的配合

### 4.9 代码质量与工具链
- 代码格式化：black / ruff format
- 静态检查：ruff / mypy
- pre-commit hooks 配置
- 项目结构最佳实践（src-layout vs flat-layout）
- 版本管理：`__version__` vs `importlib.metadata`
- CHANGELOG 与语义化版本（SemVer）

---

## 阶段五：常用库 + GUI（10 个知识点）

> 目标：能用 Python 生态解决实际领域问题，并能开发桌面应用

### 5.1 NumPy — 数值计算基石
- ndarray 创建与属性（shape/dtype/strides）
- 数组索引与切片（整数索引、布尔索引、花式索引）
- 广播（broadcasting）机制
- 通用函数（ufunc）— 向量化运算
- 线性代数基础（`np.linalg`）
- 随机数生成（`np.random` vs `Generator`）

### 5.2 Pandas — 数据分析
- Series 与 DataFrame 数据结构
- 数据读取：read_csv / read_excel / read_sql
- 数据清洗：缺失值处理、去重、类型转换
- 分组聚合：groupby / agg / transform
- 合并连接：merge / concat / join
- 时间序列处理与重采样
- `pandas-profiling` / `ydata-profiling` 快速探索

### 5.3 可视化三件套
- **Matplotlib**: Figure/Axes 架构、折线图/散点图/柱状图/直方图
- **Seaborn**: 统计图表（heatmap/pairplot/boxplot/violinplot）
- **Plotly**: 交互式图表（scatter/line/3d/dash 仪表板）

### 5.4 math + statistics — 数学与统计
- **math**: `sqrt` / `pow` / `exp` / `log` / `log10` / `log2`、`sin` / `cos` / `tan` / `asin` / `acos` / `atan`、`degrees` / `radians`、`pi` / `e` / `tau` / `inf` / `nan`、`ceil` / `floor` / `trunc` / `fabs`、`gcd` / `lcm` / `perm` / `comb`、`isclose` / `isfinite` / `isinf` / `isnan`、`erf` / `gamma` / `lgamma`
- **statistics**: `mean` / `median` / `mode` / `stdev` / `variance`、`quantiles` / `correlation` / `covariance`
- **decimal** / **fractions** — 高精度数值计算
- 实战：用纯 math 模块做简单物理模拟

### 5.5 Requests + HTTPX — 网络请求
- GET/POST/PUT/DELETE 请求
- 请求头、查询参数、请求体 (JSON/Form/File)
- Session 会话管理与 Cookie
- 超时、重试、代理
- HTTPX：支持 async/await 的现代客户端
- 实战：调用 REST API、爬取网页内容

### 5.6 Web 框架入门
- **FastAPI**: 路径装饰器、路径参数/查询参数、Pydantic 请求体验证、自动生成 OpenAPI 文档、依赖注入
- **Flask**: 路由、模板渲染（Jinja2）、请求/响应对象、扩展生态
- 对比：FastAPI（异步、类型驱动） vs Flask（同步、灵活）

### 5.7 数据库操作
- **SQLAlchemy**: ORM vs Core、Session/Engine 架构、模型定义、关系映射（1:1 / 1:N / M:N）、查询构建、alembic 数据库迁移
- **sqlite3**: 内置轻量数据库、连接与游标、参数化查询
- 实战：用 SQLAlchemy + SQLite 构建一个数据管理系统

### 5.8 CLI 工具开发
- **argparse**: 位置参数、可选参数、子命令
- **Click**: 装饰器式 CLI、上下文传递、彩色输出
- **Typer**: 基于类型注解的现代 CLI（FastAPI 同门）
- **rich**: 终端美化 — 表格、进度条、语法高亮、Markdown 渲染
- 实战：打包一个可发布的命令行工具

### 5.9 GUI 开发 — 桌面应用
- **tkinter**: Python 内置 GUI 库、窗口/Frame/Label/Button/Entry/Text、布局管理（pack/grid/place）、事件绑定与回调、文件对话框与消息框
- **CustomTkinter**: 现代化 tkinter 皮肤、暗色模式、主题系统
- **PyQt6 / PySide6**: Qt 框架绑定、信号与槽（Signal/Slot）、QMainWindow/QWidget 架构、Qt Designer 可视化布局、模型/视图（Model/View）模式、打包成独立 exe（PyInstaller）
- 实战：做一个带界面的工具（如密码管理器、笔记应用、图片浏览器）

### 5.10 并发与性能优化
- 线程池（`concurrent.futures.ThreadPoolExecutor`）
- 进程池（`ProcessPoolExecutor`）— 绕过 GIL
- `threading` vs `multiprocessing` — GIL 的影响
- `timeit` / `cProfile` — 性能测量
- 列表 vs NumPy vs 生成器 的性能对比
- 实战：加速数据处理流水线

---

## 阶段六：深度学习（7 个知识点）

> 目标：掌握 PyTorch 核心，能训练和部署神经网络模型

### 6.1 PyTorch 基石 — Tensor 与 Autograd
- Tensor 创建、属性（shape/dtype/device）
- GPU 加速（`.cuda()` / `.to(device)`）
- 自动求导（`requires_grad` / `backward()` / `grad`）
- 计算图（computation graph）与梯度累积
- `torch.no_grad()` / `torch.inference_mode()` 推理模式

### 6.2 数据加载与预处理
- `Dataset` — 自定义数据集类（`__len__` + `__getitem__`）
- `DataLoader` — batch / shuffle / num_workers / collate_fn
- `torchvision.transforms` — 图像增强（Resize/Normalize/RandomCrop）
- `torchvision.datasets` — 常用数据集（MNIST/CIFAR/ImageNet）
- HuggingFace `datasets` 库入门

### 6.3 神经网络基础构件
- `nn.Module` — 模型基类，参数注册
- `nn.Linear` / `nn.Conv2d` / `nn.RNN` — 核心层
- 激活函数：ReLU / Sigmoid / Tanh / GELU / Softmax
- `nn.Sequential` vs 自定义 `forward()`
- 损失函数：MSELoss / CrossEntropyLoss / BCELoss
- 参数初始化（Xavier/Kaiming）

### 6.4 训练循环与优化器
- 训练循环模板：`for epoch → for batch → forward → loss → backward → step`
- 优化器：SGD / Adam / AdamW — 区别与选择
- 学习率调度：StepLR / ReduceLROnPlateau / CosineAnnealingLR
- 过拟合应对：Dropout / BatchNorm / Weight Decay / Early Stopping
- TensorBoard 可视化训练曲线

### 6.5 卷积神经网络（CNN）
- 卷积层原理（kernel / stride / padding / dilation）
- 池化层（MaxPool / AvgPool / AdaptivePool）
- 经典架构：LeNet → AlexNet → VGG → ResNet（跳跃连接）
- BatchNorm 层的作用
- 实战：CIFAR-10 图像分类 90%+

### 6.6 迁移学习与预训练模型
- 为什么要迁移学习：数据不够时的解决方案
- `torchvision.models` — ResNet/EfficientNet/ViT 预训练权重
- 特征提取 vs 微调（feature extraction vs fine-tuning）
- 冻结/解冻层策略
- HuggingFace `transformers` — BERT/GPT 用于自己的任务
- `timm` 库 — 最强的 PyTorch 图像模型库

### 6.7 模型部署基础
- 模型保存与加载：`state_dict` vs 完整模型
- `torch.jit.script` / `torch.jit.trace` — TorchScript 导出
- ONNX 导出（`torch.onnx.export`）
- 量化（quantization）概念 — 减小模型体积、加速推理
- 实战：训练一个模型 → 转 ONNX → 用 onnxruntime 推理

---

## 学习节奏建议

| 阶段 | 预计时间 | 节奏 |
|------|---------|------|
| 阶段一 | 1-2 周 | 每天 1 个知识点，讲解 + 练习 |
| 阶段二 | 2-3 周 | 每个知识点 1-2 天，装饰器/魔术方法可多花时间 |
| 阶段三 | 2-3 周 | 内置函数可以快速过，重点在实战组合 |
| 阶段四 | 2-3 周 | 异步编程和测试是重点 |
| 阶段五 | 3-4 周 | 每个库一个实战小项目 |
| 阶段六 | 4-6 周 | 每个知识点需要 3-5 天消化 |

**总计约 14-21 周**，从零基础到能独立完成深度学习项目。

---

## 记录

| 日期 | 知识点 | 动作 | Git Commit |
|------|--------|------|------------|
| 2026-06-07 | 列表与元组 | 讲解完成 | - |
| 2026-06-11 | - | 创建学习计划 | - |
