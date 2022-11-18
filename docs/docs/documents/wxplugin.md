# 微信插件


nanachi从1.2.7中支持微信插件

相关介绍 

https://mp.weixin.qq.com/wxopen/plugindevdoc?appid=wx56c8f077de74b07c&token=1011820682&lang=zh_CN#-

## 使用

在wxConfig.json添加

```json
{
    "plugins": {
        "goodsSharePlugin": {//pluginName
          "version": "2.1.4",
          "name": "share-button",
          "tagName": "share-button",//可不写。当tagName和name一致时，可不写！！！
          "provider": "wx56c8f077de74b07c"
        }
     }
}
```
我们在内部就转换成一个对象

```json
plugin:{
  "share-button": "plugin://goodsSharePlugin/share-button"
}

```
整体计算公式是：`${name}: plugin://${pluginName}/${tagName?tagName:name}`



```html
<div>
{ this.state.ANU_ENV == 'wx'  && 
  <div style="margin: 4px 0px"><share-button product={this.state.product} /></div> }
</div>
```

> 微信小程序的插件需要在后台中配置使用，可以用`wx799d4d93a341b368` 这个appid进行测试