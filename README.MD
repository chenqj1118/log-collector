

# 前端日志采集模块

```
npm i
npm run serve
```

```
// 打包
npm run build
```

## 概述

模块名：`log-collector` 

## 功能

- **日志分析维度和价值**

  * 用户在网页中浏览感兴趣的产品、功能、案例等信息
  * 用户登录时长
  * 用户的平台、浏览器、访问时间、ip（解析所属地）等信息对用户进行用户画像
  * 用户在每个页面中的停留时间
  * 用户从哪些渠道跳转到当有网页以及占比
  * 用户在做一些操作时，会卡在哪一步，这一步是否可以优化
  * 用户操作中断的页面（session过期时停留的页面）

- **前端发送日志场景**

  * 进入某个页面

  * 页面上某个按钮点击

  * 离开某个页面

  * 用户输入

-  **日志数据传输**

  前端将采集到的信息分为两大类：

  * agent信息、page信息、user信息等作为头信息，因为每次行为发生时，这些信息都不会发生变化

  * 用户页面的click、load等事件发生时，前端采集到的时间、元素、文本内容等作为明细信息。

     页面加载的时候，前端将头信息采集并存入内存。

     在监听到页面加载、点击、离开、输入等行为时候，前端采集相应的时间、元素、文本内容等信息作为行为日志，存入内存。如果该行为与后端有交互，即会向后端发送请求，则前端需生成一组traceId和spanId，用于跟踪，在发送请求时，需要将traceId和spanId作为参数发送。

     在监听到页面离开时，前端日志的头信息和行为信息（1条头信息，多条行为信息）发送给后端。
     
## 日志采集模块如何使用

### 前端如何埋点

```
// 标识缩写
data-tracking-type --> data-bktt // 类型
data-tracking-descr --> data-bktd // 描述
data-tracking-indexs --> data-bkti // 行号
```

```html
<!--埋点方式1-->  
  <button v-track data-bktt="click,mouseover" data-bktd="测试点击行为">测试点击行为</button>
  <button v-track data-bktt="mousedown" data-bktd="测试mousedown行为">测试mousedown行为</button>
  <button v-track data-bktt="mouseover" data-bktd="测试点击行为">测试鼠标经过行为</button>
  <button v-track data-bktt="dblclick" data-bktd="测试双击行为">测试双击行为</button>
  <button v-track data-bktt="contextmenu" data-bktd="测试鼠标右键行为">测试鼠标右键行为</button>
  <input v-track type="text" data-bktt="change" data-bktd="用户名"/>
  <button v-track id="requestBtn" data-bktt="click" data-bktd="测试request行为">测试request行为</button>
```
```html
<!--埋点方式2-->  
<button v-track="{bktt: 'click,mouseover', bktd: '测试点击行为'}">测试点击行为</button>
<a-date-picker v-track="{ bktt:'change', bktd: '日期' }"/>
```

> `data-bktt`  来标记当前元素监听什么事件, 支持多个事件，例如 click,mouseover
>
> `data-bktd` 标记行为描述
>
> click | mouseover... 更多事件类型详见：https://www.w3.org/TR/2022/WD-uievents-20220629/#event-types-list
>
> <u>**注意：普通控件(例：button、input等)以上两种埋点方式均可，但有些一特殊组件(例：a-date-picker等控件，由于其封装比较深)埋点方式1将不生效，故而只能用埋点方式2来埋点
> （未使用`vue react angular `等前端框架的  普通`dom`的埋点不需要加自定义指令`v-track`，直接`data-bktt="" data-bktd=""`即可）**</u> 
> 
#### 以下基于antDesign特殊控件埋点
 1. 关于`dialog`的埋点：必须使用slot方式自定义，否则无法埋点，如下：

 ```html
<a-modal>
 <div data-bktd="xx弹窗body">
 xxx
 </div>
 <template #footer>
     <a-button key="back" v-track="{ bktt: 'click', bktd: '取消' }" @click="handleCancel">取消</a-button>
     <a-button key="submit" type="primary" v-track="{ bktt: 'click', bktd: '确定' }" @click="handleOk">确定</a-button>
 </template>
</a-modal>
 ```

 2. 关于select控件，前后端(自动化测试)约束  埋点是click事件，不要是change事件，且options也需要埋点
```html
<a-select v-model:value="serviceType" placeholder="请选择产品服务" v-track="{ bktt:'change', bktd: '产品服务' }" id="searchSelect1" @change="doTrackInVue({id: 'searchSelect1', value: serviceType})">
          <a-select-option value="premiumVipService" data-bktt="click" data-bktd="高级会员月服务">高级会员月服务</a-select-option>
          <a-select-option value="mediumVipService" data-bktt="click" data-bktd="中级会员月服务">中级会员月服务</a-select-option>
          <a-select-option value="ordinaryVipService" data-bktt="click" data-bktd="普通会员月服务">普通会员月服务</a-select-option>
</a-select>
```

 3. tab埋点

    ```html
    <a-tab-pane key="batch">
       <template #tab>
          <span v-track="{ bktt: 'click', bktd: '批量'}">批量</span>
       </template>
    </a-tab-pane>
    ```

 4. table行号埋点  & 行折叠埋点

    ```html
    <a-table
      :columns="singleColumns"
      :data-source="singleData"
      data-bktd="单条列表"
      :customRow="
        (_record, index) => {
          return {
            'data-bkti': index,
          };
        }
      ">
    <template #expandIcon="props">
      <button class="ant-table-row-expand-icon ant-table-row-expand-icon-expanded" v-if="props.expanded" v-track="{ bktt: 'click', bktd: '关闭行'}" title="关闭行" @click="e => {props.onExpand(props.record, e);}"/>
      <button class="ant-table-row-expand-icon ant-table-row-expand-icon-collapsed" v-else v-track="{ bktt: 'click', bktd: '展开行'}" title="展开行" @click="e => {props.onExpand(props.record, e);}"/>
     </template>
    </a-table>
    ```

    

 5. range-picker埋点
```javascript
  // tpl:
  <a-range-picker v-model:value="uploadDate" format="YYYY-MM-DD" @change="onRangeChange" id="rangePicker1" v-track="{ bktt:'change', bktd: '查询日期' }"/>

  // ts:
  import { doTrackInVue } from '/@/scripts/utils/logsCollector';

  const onRangeChange = (_date: [dayjs.Dayjs, dayjs.Dayjs], dateString: [string, string]) => {
    // todo 业务层
    doTrackInVue({
      id: 'rangePicker1', (与tpl上控件id一致)
      value:  '新值'  (行为记录的值)，
      bktt: '',
      bktd: ''((bktt & bktd) || id 二选一， 前者优先)
    });
  };
```
 6. axios请求request & response分别埋点

    ```javascript
    const options = {
        method: 'POST',
        headers: {},
        data: {},
        url: requestUrl
      };
      options.headers[reqMap.traceId] = eventTraceId;
      options.headers[reqMap.spanId] = eventSpanId;
      axios(options)
        .then(response => {
          if (response.data && response.data.success) {
            // todo success: dosomething
            logsCollector.pushRequestEvent(eventTraceId, response.headers[reqMap.spanId], requestUrl, 'success', response.data.message); // 请求成功时
          } else {
            // todo failed: dosomething
            logsCollector.pushRequestEvent(eventTraceId, response.headers[reqMap.spanId], requestUrl, 'failed', response.data.message); // 请求出错时
          }
        })
        .catch(error => {
          logsCollector.pushRequestEvent(eventTraceId, startRequestObj.spanId, requestUrl, 'failed', error.message); // 请求出错时
        });
    ```

    

### 自动化测试相关

```
COMMENTS: |
 # 使用系统指令设置 UI 模式，打开具体网址
 * 模式 yipin
 * 开始测试 https://data.bokesoft.com/admin.html#/login
 * 执行文件 classpath:/xx/issues/issue00.yml
 * 完成测试
---

commands: |
 * 添加变量 Var1
---

commands: |
 点击 A/#3/C
 读取 A/#3/C Var1
 输入 A/#3/C "Hello ${Var1}"
 
asserts: |
 检查 A/#3/C Hello
---

//*[data-bktd='A']/*[data-bkti=3]/*[...]
```



### 模块初始化

```javascript
// 在页面调用
const logCollector = require('log-collector'); // 引入采集脚本模块
const serverUrl = '/router/log'; // 配置日志收集接口
let logsCollector = new LogCollector({ serverUrl, pageCode: 'test', pageVersion: '0.0.1' }); // 生成采集器实例
```

> 将日志采集数据挂载到`window.logsCollector`  或者 `Vuex` 便于获取和操作, 传入构造器的参数如下，为方便日志发送到后端，`serverUrl`字段为必填
>
> ```
>     this.domain = options.domain || '';
>     this.pageUrl = options.pageUrl || '';
>     this.pageTitle = options.pageTitle || '';
>     this.referrer = options.referrer || '';
>     this.pageCode = options.pageCode || '';
>     this.pageVersion = options.pageVersion || '';
>     this.screenHeight = options.screenHeight || 0;
>     this.screenWidth = options.screenWidth || 0;
>     this.language = options.language || '';
>     this.userAgent = options.userAgent || '';
>     this.clientId = nanoid();
>     this.userId = cookie.get('userID') || '';
>     this.sessionId = cookie.get('JSESSIONID') || cookie.get('sessionId') || '';
> ```
>
> 

## 模块`API`设计

### `pushEvent`: 添加行为日志

- 参数: 

  - {Object} eventObj 行为对象  

- 返回值：无 (赋值)

  > ```javascript
  > class Event { // 行为类
  >   constructor(options) {
  >     this.actionTime = options.actionTime || (new Date).getTime();
  >     this.behaviorType = options.behaviorType || '';
  >     this.traceId = nanoid();
  >     this.spanId = nanoid();
  >   }
  > }
  > ```

### `pushError`: 添加报错日志

- 参数: 

  - {Object} options行为对象  

- 处理逻辑
  
  - > ```javascript
    >   pushError(options) {
    >     let errorObj = new ErrorLog(options);
    >     this.errorQueue.push(errorObj);
    >   }
    > 
    > class ErrorLog { // 错误类
    >   constructor(options) {
    >     this.errorMessage = options.errorMessage || '';
    >     this.url = options.url || '';
    >     this.line = options.line || 0;
    >     this.column = options.column || 0;
    >     this.error = options.error || null;
    >     this.happenTime = options.happenTime || (new Date).getTime();
    >   }
    > }
    > ```

> 

### `listenEvent`: 监听行为

- 参数:

  - {Object} `$el` dom对象   如：document.querySelector('[data-bktt]')
  - {String} `eventType` 行为类型， 如：'click', 'dbclick', 'mousedown', 'mouseover', 'contextmenu', 'change' 等

- 返回值: 无

- 处理逻辑

  ```javascript
    listenEvent($el, eventType) { // eventType: click | load | unload 等
      $el = $el || document;
      $el.addEventListener(eventType, event => {
        let eventObj = new Event({ behaviorType: event.type });
  
        // dom上添加标记，用于行为跟踪
        let dom = event.target === document ? event.target.querySelector('body') : event.target;
        dom.dataset.traceId = eventObj.traceId;
  
        eventType === 'load' && (eventObj.referrer = document.referrer);
        const eventEnum = ['click', 'dbclick', 'mousedown', 'mouseover', 'contextmenu', 'change'];
        if (eventEnum.includes(eventType)) {
          eventObj.elementLocator = event.target.tagName + (event.target.id ? '#' + event.target.id : (event.target.className ? '.' + event.target.className : ''));
          eventObj.elementContent = event.target.textContent;
          eventType === 'change' && (eventObj.inputText = event.target.value);
        }
        this.pushEvent(eventObj);
      });
    }
  ```

### `sendData`: 发送日志

- 参数: 
  - {String} url 日志收集接口
  - {Object} data 日志数据
- 返回值：无
- 处理逻辑

```javascript
  sendData(url, data = {}) {
    const _syncRequest = (url, data = {}) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, false);
      xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
      xhr.send(JSON.stringify(data));
    };
    const _sendBeacon = (url, data = {}) => {
      return navigator.sendBeacon(url, JSON.stringify(data));
    }
    const sendReport = (url, data) => {
      if (navigator.sendBeacon) {
        const joinedQueue = _sendBeacon(url, data);
        console.log('用户代理把数据加入传输队列' + (joinedQueue ? '成功' : '失败'));
        if (joinedQueue) {
          setTimeout(() => {
            this.cleanUpEvents(data); // 清理采集信息
          }, 5000)
        } else {
          _syncRequest(url, data)
        }
      } else {
        _syncRequest(url, data);
      }
    }
    if (data.eventsQueue && data.eventsQueue.length) {
      sendReport(url, data);
    }
  }
```



## 难点

### `unload` 事件监听

  > ```javascript
  >     document.addEventListener('visibilitychange', () => { // 监听unload，页面离开时，提交采集数据
  >       if (document.visibilityState === 'hidden') {
  >         this.pushEvent(new Event({ behaviorType: 'unload' }));
  >         console.log('页面离开了, 采集数据(window.logsCollector)：', this);
  >         this.sendData(options.serverUrl, this);
  >       } else {
  >         console.log('页面回来了');
  >       }
  >     });
  > ```

### `unload` 页面离开时日志发送

  > ```javascript
  >     const _sendBeacon = (url, data = {}) => {
  >       return navigator.sendBeacon(url, JSON.stringify(data));
  >     }
  > ```

### `parentId` 用于行为跟踪的`parentId`如何获取

  > ```javascript
  >       // dom上添加标记，用于行为跟踪
  >       let dom = event.target === document ? event.target.querySelector('body') : event.target;
  >       dom.dataset.traceId = eventObj.traceId;
  > ```
  >
  > 行为监听时，将`traceId `挂载到`dom`元素上



## **日志相关字段**

### **日志头表**

***\*[前端]\****前端采集日志

| 字段名称     | 示例                                                         | 描述                                                         |
| ------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| traceId      |                                                              | 跟踪Id，本次日志包发送请求的traceId，由前端生成，跟随日志包发传给后端 |
| spanId       |                                                              | 跨度Id，本次日志包发送请求的spanId，前端生成，跟随日志包发传给后端 |
| userAgent    | Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; en-us) AppleWebKit/534.50 (KHTML, like Gecko) Version/5.1 Safari/534.50 | User-Agent详情                                               |
| screenWidth  | 1024                                                         | 浏览器屏幕宽度                                               |
| screenHeight | 768                                                          | 浏览器屏幕高度                                               |
| pageCode     | DRP321101                                                    | 页面Code, 事先定义                                           |
| pageTitle    | 物料相似度评估                                               | 页面标题                                                     |
| pageUrl      | https://data.bokesoft.com/my.html#/billList                  | 访问的页面地址                                               |
| pageVersion  | 1.03                                                         | 页面版本                                                     |
| userId       |                                                              | 登录用户使用登录用户的id                                     |
| clientId     | (uuid)                                                       | 非注册用户根据浏览器生成一个uuid                             |
| sessionId    | sessionId                                                    | 当前连接的sessionId，用于区分同一连串的操作                  |

 

***\*[Frontend]\****前端传输的日志基础上进行补充

| 字段名称   | 示例           | 描述                     |
| ---------- | -------------- | ------------------------ |
| traceId    |                | 跟踪Id，由前端生成       |
| pspanId    |                | 跨度Id，前端产生的spanId |
| spanId     |                | 跨度Id，后端产生的spanId |
| ......     |                |                          |
| ip         | 180.168.62.98  | Ip地址                   |
| language   | zh-CN          | 页面语言（多语种）       |
| appName    | FireFox        | 浏览器名称               |
| appCode    | Mozilla        | 浏览器项目名称           |
| appVersion | 102.0.5005.115 | 浏览器版本               |
| platform   | Linux x86_64   | 平台                     |

 

### **日志明细表**

***\*[前端]\****前端采集日志-页面加载

| 字段名称     | 示例                   | 描述                                  |
| ------------ | ---------------------- | ------------------------------------- |
| traceId      |                        | 跟踪Id，本次行为的traceId，由前端生成 |
| spanId       |                        | 跨度Id，本次行为的spanId，前端生成    |
| currentTime  | 2022-6-22 12:22:23     | 当前时间                              |
| behaviorType | load                   | 行为类型                              |
| referrer     | https://www.baidu.com/ | 来自地址（type=load）                 |

***\*[前端]\****前端采集日志-页面离开

| 字段名称     | 示例               | 描述                                  |
| ------------ | ------------------ | ------------------------------------- |
| traceId      |                    | 跟踪Id，本次行为的traceId，由前端生成 |
| spanId       |                    | 跨度Id，本次行为的spanId，前端生成    |
| currentTime  | 2022-6-22 12:22:23 | 当前时间                              |
| behaviorType | unload             | 行为类型                              |

***\*[前端]\****前端采集日志-页面元素点击

| 字段名称     | 示例               | 描述                                  |
| ------------ | ------------------ | ------------------------------------- |
| traceId      |                    | 跟踪Id，本次行为的traceId，由前端生成 |
| spanId       |                    | 跨度Id，本次行为的spanId，前端生成    |
| currentTime  | 2022-6-22 12:22:23 | 当前时间                              |
| behaviorType | click              | 行为类型                              |
| element      | #searchBtn         | 元素的selector（type=click,input）    |
| content      | 搜索               | 元素的content（type=click,input）     |

***\*[前端]\****前端采集日志-文本框输入

 

| 字段名称     | 示例               | 描述                                  |
| ------------ | ------------------ | ------------------------------------- |
| traceId      |                    | 跟踪Id，本次行为的traceId，由前端生成 |
| spanId       |                    | 跨度Id，本次行为的spanId，前端生成    |
| date         | 2022-6-22 12:22:23 | 当前时间                              |
| behaviorType | click              | 行为类型                              |
| element      | #searchBtn         | 元素的selector（type=click,input）    |
| content      | 搜索               | 元素的content（type=click,input）     |
| inputText    | 螺丝               | 文本输入内容（type=input）            |

 

***\*[前端]\****前端采集日志-后端交互

| 字段名称     | 示例               | 描述                                  |
| ------------ | ------------------ | ------------------------------------- |
| traceId      |                    | 跟踪Id，本次行为的traceId，由前端生成 |
| spanId       |                    | 跨度Id，本次行为的spanId，前端生成    |
| currentTime  | 2022-6-22 12:22:23 | 当前时间                              |
| behaviorType | request            | 行为类型                              |
| url          |                    | 请求地址                              |
| requestBody  |                    | 请求参数                              |
| responseBody |                    | 返回结果                              |
| requestTime  |                    | 发送请求时间                          |
| returnTime   |                    | 返回时间                              |

行为链：页面载入→元素点击→后端交互→离开页面

 

***\*[后端]\****后端采集日志

| 字段名称     | 示例               | 描述                                  |
| ------------ | ------------------ | ------------------------------------- |
| traceId      |                    | 跟踪Id，本次行为的traceId，由前端生成 |
| pspanId      |                    | 父级跨度Id，前端传的spanId，          |
| spanId       |                    | 跨度Id，后端产生                      |
| currentTime  | 2022-6-22 12:22:23 | 当前时间（后端系统时间）              |
| behaviorType | request            | 行为类型                              |
| url          |                    | 请求地址                              |
| requestTime  |                    | 发送请求时间                          |
| returnTime   |                    | 返回时间                              |

 
