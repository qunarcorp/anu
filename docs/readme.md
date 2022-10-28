# anu小程序的官网地址

依赖于ydoc
```
npm i ydoc
```

## 如何本地运行文档
在以下路径运行 /anu/docs
```
ydoc build
ydoc serve
```

## 如何修改文档
进入以下路径 /anu/docs/docs，所有修改都在此目录下进行


## 如何发布文档到线上
该路径下需要存在 index.html | jsx | md : /anu/docs
 
```
./publish.sh
```

## 如果你想获得干净的md源文件并重新 build
保留 /anu/docs/ 中的
- docs
- publish.sh
- search_json.js
- ydoc.json
- readme.md

其余 /anu/docs 下的文件全部删除，然后从 build 开始执行