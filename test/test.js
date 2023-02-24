const axios = require('axios');
const LogCollector = require('../src/index');
const serverUrl = '/router/log'; // 日志收集接口
const reqMap = {
  traceId: 'x-b3-traceid',
  spanId: 'x-b3-spanid'
}
let logsCollector = new LogCollector({ serverUrl, pageCode: 'test', pageVersion: '0.0.1' });
window.logsCollector = logsCollector;

document.querySelector('#requestBtn').onclick = event => {
  const eventTraceId = event.target.dataset.traceId;
  const eventSpanId = event.target.dataset.spanId;
  const requestUrl = '/router/getLog';
  let startRequestObj = logsCollector.pushRequestEvent(eventTraceId, eventSpanId, requestUrl, 'start');

  // 实际业务场景可能是：ajax || axios || fetch 等
  const options = {
    method: 'POST',
    headers: {},
    data: logsCollector,
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
};

// const timer1 = setInterval(() => { // 3分钟定时任务，提交采集数据
//   logsCollector.sendData(serverUrl, logsCollector);
// }, 1000 * 60 * 3);

// throw new Error('测试出错了！');
