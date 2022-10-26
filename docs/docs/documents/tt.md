## 字节小程序相关

### 列表渲染
建议列表渲染一定要加key属性，指定当前项的唯一标识！！！

建议列表渲染一定要加key属性，指定当前项的唯一标识！！！

建议列表渲染一定要加key属性，指定当前项的唯一标识！！！

*否则数据会重复渲染当前组件，出现比如input框会闪烁，白屏等异常情况。*

#### 原因如下：
先来了解下字节小程序中的写法
```
<view tt:for="{{array}}" tt:for-index="idx" tt:for-item="itemName" tt:key={itemName.name}>
  {{idx}}: {{itemName.message}}
</view>
```
其中，tt:key的含义：

当列表内容变化时，某些元素会被重新渲染而失去之前的 UI 状态，如果希望前后保持相同的状态，可以使用tt:key来指定列表中项目的唯一标识，这个可以类比 React 或者 Vue 中列表渲染的 key。

tt:key 如何指定：
- 字符串，代表 item 的某个字段，比如tt:key="unique"，那么指定 item 的 unique 字段为 key
- *this，代表 item 本身，比如tt:key="*this"，那么就是用 item 本身（字符串）作为 key

因此，当我们遍历的数组每项为json时，最好指定tt:key 为item的某个字段。当基础类型数组时，可以指定为*this。

nanachi会把类react语法编译成字节小程序源码，不设置key或设置key为index，tt:key会直接指定为*this；设置key为某个值的话，tt:key会直接指定为指定的值；