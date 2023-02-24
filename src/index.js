/**
 * @ Author: chenqj
 * @ Create Time: 2022-07-13 15:53:47
 * @ Modified by: Your name
 * @ Modified time: 2023-02-14 17:38:49
 * @ Description:
 */

let cookie = require("js-cookie");
if (!cookie.get || !cookie.set) {
  cookie = cookie.default;
}
const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("1234567890", 10);

if (!cookie.get('clientId')) {
  cookie.set('clientId', nanoid());
}

class Event {
  // 行为类
  constructor(options) {
    this.actionTime = options.actionTime || new Date().getTime();
    this.eventType = options.eventType || "";
    this.traceId = options.traceId || nanoid();
    this.spanId = options.spanId || nanoid();
    options.elementContent && (this.elementContent = options.elementContent);
    options.elementLocator && (this.elementLocator = options.elementLocator);
    options.pSpanId && (this.pSpanId = options.pSpanId);
    options.requestUrl && (this.requestUrl = options.requestUrl);
    options.responseUrl && (this.responseUrl = options.responseUrl);
    options.state && (this.state = options.state);
    options.msg && (this.msg = options.msg);
    options.argument1 && (this.argument1 = options.argument1);
    options.argument2 && (this.argument2 = options.argument2);
  }
}

class ErrorLog {
  // 错误类
  constructor(options) {
    this.errorMessage = options.errorMessage || "";
    this.url = options.url || "";
    this.line = options.line || 0;
    this.column = options.column || 0;
    this.error = options.error || null;
    this.happenTime = options.happenTime || new Date().getTime();
  }
}

class LogCollector {
  // 日志收集器类
  constructor(options = {}) {
    // 头信息
    this.domain = options.domain || "";
    this.pageUrl = options.pageUrl || "";
    this.pageTitle = options.pageTitle || "";
    this.referrer = options.referrer || "";
    this.pageCode = options.pageCode || "";
    this.pageVersion = options.pageVersion || "";
    this.screenHeight = options.screenHeight || 0;
    this.screenWidth = options.screenWidth || 0;
    this.language = options.language || "";
    this.userAgent = options.userAgent || "";
    this.clientId = cookie.get('clientId');
    this.userId = cookie.get("userID") || cookie.get("YIGO-CLOUD-TOKEN") || "";
    this.sessionId = cookie.get("JSESSIONID") || cookie.get("sessionId") || "";
    this.eventsQueue = []; // 明细
    this.errorQueue = [];

    if (document) {
      // Document对象数据
      this.domain = this.domain || document.domain;
      this.pageUrl = this.pageUrl || String(document.URL);
      this.pageTitle = this.pageTitle || document.title;
      this.referrer = this.referrer || String(document.referrer);
    }

    if (window && window.screen) {
      // Window对象数据
      this.screenHeight = this.screenHeight || window.screen.height;
      this.screenWidth = this.screenWidth || window.screen.width;
    }

    if (navigator) {
      // navigator对象数据
      this.language = this.language || navigator.language;
      this.userAgent = this.userAgent || navigator.userAgent;
    }
    // if (window && window.performance) { // 获取性能相关参数
    //   const _formatMemory = val => {
    //     // 格式化内存数据
    //     return Math.floor(val / 1024 / 1024) + 'mb';
    //   };
    //   const _formatTimeToSecord = val => {
    //     // 转换为秒
    //     return val / 1000 + 's';
    //   };
    //   this.memory = _formatMemory(window.performance.memory.usedJSHeapSize);
    //   this.connectTime = _formatTimeToSecord(
    //     window.performance.timing.connectEnd - window.performance.timing.connectStart
    //   );
    //   this.responseTime = _formatTimeToSecord(
    //     window.performance.timing.responseEnd - window.performance.timing.responseStart
    //   );
    //   window.performance.timing.domComplete && (this.renderTime = _formatTimeToSecord(
    //     window.performance.timing.domComplete - window.performance.timing.domLoading
    //   ));
    // }

    this.listenEvent(window, "load");
    this.listenEvent(document, "visibilitychange");
    this.listenEvent(window, "unload", () => {
      this.sendData(options.serverUrl, this); // 监听unload，页面离开时，提交采集数据
    });
    document.querySelectorAll("[data-bktt]").forEach((ele) => {
      this.addListenEvent(ele);
    });

    window.onerror = (errormessage, url, line, column, error) => {
      // 收集报错
      this.pushError({ errormessage, url, line, column, error: error.stack });
    };

    // this.getUserIp().then(res => {
    //   this.userIP = res;
    // });
  }

  addListenEvent(ele) {
    ele.dataset.bktt.split(",").forEach((trackingType) => {
      this.listenEvent(ele, trackingType);
    });
  }

  getUserIp() {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        /* 地理位置服务可用 */
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve(position);
          },
          (err) => {
            reject(err);
          }
        );
      } else {
        reject("地理位置服务不可用");
      }
    });
    // return new Promise((resolve, reject) => {
    //   const scriptElement = document.createElement('script');
    //   scriptElement.src = `http://pv.sohu.com/cityjson?ie=utf-8`;
    //   document.body.appendChild(scriptElement);
    //   scriptElement.onload = () => {
    //     try {
    //       document.body.removeChild(scriptElement);
    //       resolve(returnCitySN);
    //     } catch (e) {
    //       reject(e);
    //     }
    //   };
    // });
  }

  newEvent(options) {
    return new Event(options);
  }

  pushEvent(eventObj) {
    // console.log(eventObj);
    // dom上添加标记，用于行为跟踪
    let dom = event?.currentTarget;
    if (!dom || dom === document || dom.responseURL || eventObj.eventType === 'route-load') {
      dom = document.querySelector("body")
    }
    
    if (dom.dataset) {
      dom.dataset.traceId = eventObj.traceId;
      dom.dataset.spanId = eventObj.spanId;
    }
    this.eventsQueue.push(eventObj);
  }

  pushError(options) {
    let errorObj = new ErrorLog(options);
    this.errorQueue.push(errorObj);
  }

  listenEvent($el, eventType, callback) {
    // eventType: click | load | unload 等
    $el = $el || document;
    $el.addEventListener(
      eventType,
      (event) => {
        let eventObj = new Event({ eventType: event.type });

        eventObj.elementContent =
          event.target.dataset?.bktd || event.target.textContent || "";
        eventObj.elementLocator = event.target.tagName
          ? event.target.tagName +
            (event.target.id
              ? "#" + event.target.id
              : event.target.className
              ? "." + event.target.className
              : "")
          : "";
        if (eventObj.elementContent) {
          const _getParentsBktd = (el, parentSelector) => {
            parentSelector = parentSelector || document;
            let parents = [];
            let p = el.parentNode;
            while (p !== parentSelector) {
              let _temp = p;
              if (_temp?.dataset?.bktd || _temp?.dataset?.bkti) {
                parents.push(_temp.dataset?.bktd || _temp?.dataset?.bkti);
              }
              p = _temp?.parentNode;
            }
            return parents;
          };
          let path = _getParentsBktd($el).reverse().join("/");
          eventObj.elementContent =
            (path ? `${path}/` : "") + eventObj.elementContent;
        }
        eventType === "change" && (eventObj.argument1 = event.target.value);
        if (eventType === "visibilitychange") {
          if (event.target.visibilityState === "hidden") {
            // 焦点是否离开当前页面
            eventObj.argument1 = "hidden";
          } else {
            eventObj.argument1 = event.target.visibilityState;
          }
        }
        this.pushEvent(eventObj);
        callback && callback();
      },
      true
    );
  }

  pushRequestEvent(prevTraceId, prevSpanId, requestUrl, state, msg) {
    let eventObj = this.newEvent({
      eventType: "request",
    });
    eventObj.state = state;
    prevTraceId && (eventObj.traceId = prevTraceId);
    prevSpanId && (eventObj.pSpanId = prevSpanId);
    eventObj.requestUrl = requestUrl;
    msg && (eventObj.msg = msg);
    this.pushEvent(eventObj);
    return eventObj;
  }

  cleanUpEvents(logsCollector) {
    // 行为队列清理
    logsCollector.eventsQueue = [];
    logsCollector.errorQueue = [];
  }

  // parse2args (params) {//拼接参数串
  //   let args = '';
  //   for(let i in params) {
  //       if(args != '') {
  //           args += '&';
  //       }
  //       args += i + '=' + encodeURIComponent(params[i]);
  //   }
  //   return args;
  // }
  // sendData (args) { //通过Image对象请求后端脚本
  //   let img = new Image(1, 1);
  //   img.src = options.serverUrl + '/log.gif?' + args;
  // }
  sendData(url, data = {}) {
    const _syncRequest = (url, data = {}) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, false);
      xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
      xhr.send(JSON.stringify(data));
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
          this.cleanUpEvents(data); // 清理采集信息
        }
      };
    };
    const _sendBeacon = (url, data = {}) => {
      return navigator.sendBeacon(url, JSON.stringify(data));
    };
    const sendReport = (url, data) => {
      if (navigator.sendBeacon) {
        const joinedQueue = _sendBeacon(url, data);
        console.log(
          "用户代理把数据加入传输队列" + (joinedQueue ? "成功" : "失败")
        );
        if (joinedQueue) {
          this.cleanUpEvents(data); // 清理采集信息
        } else {
          _syncRequest(url, data);
        }
      } else {
        _syncRequest(url, data);
      }
    };
    if (data.eventsQueue?.length && url) {
      sendReport(url, data);
    }
  }
}

module.exports = LogCollector;
