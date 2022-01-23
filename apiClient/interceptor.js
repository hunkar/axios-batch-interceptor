import axios from "axios";
import qs from "qs";

//If same requests come to interceptor during timeout, we will continue to collect them.
const REQUEST_WAITING_TIMEOUT = 100;

//We need timeouts to collect same requests by url.
const _refreshedTimeouts = {};

//We collect requests under _requests object by url.
const _requests = {};

/**
 * After handling request group, this function clear timeout and request array by url.
 *  @param {String} url
 */
const clearRequests = (url) => {
  clearTimeout(_refreshedTimeouts[url]);
  _refreshedTimeouts[url] = null;
  _requests[url] = [];
};

/**
 *  Creating object from array for easy access to item by id.
 *  @param {Array} itemArray array of item.
 *  @returns {Object} hashed object.
 */
const getObjectFromItemArray = (itemArray) => {
  const mapObject = {};

  itemArray.forEach((item) => {
    mapObject[item.id] = item;
  });

  return mapObject;
};

/**
 * This function handle request group by url.
 * As a first merge all request bodies.
 * Reference request is first item of request array. We manipulate params and set url of that request and send to server.
 * After that find all results for responses.
 * If request has non exist fileid then call reject with Error. Otherwise call reject with data.
 * I don't use resolve for success results. Because We don't want multiple requests to server but resolve is trigger axios to request to server.
 *
 * @param {String} url
 */
const handleRequests = (url) => {
  //Merge all ids in request group.
  let ids = [].concat(
    ..._requests[url].map(({ request }) => request.params.ids)
  );

  //Remove dublicate ids.
  ids = ids.filter((id, index) => ids.indexOf(id) === index);

  //Use first request as reference. After that manipulate params and url of request.
  const referenceRequest = { ..._requests[url][0].request };
  referenceRequest.params = { ids };
  referenceRequest.url = `${referenceRequest.host}${referenceRequest.url}`;

  //Send axios request.
  axios
    .request(referenceRequest)
    .then((result) => {
      const { data = {} } = result;
      const itemsMapObject = getObjectFromItemArray(data.items);

      //Find result for all requests.
      _requests[url].forEach(({ request, reject }) => {
        let responseData = [];
        let notExistId = false;

        (request.params.ids || []).forEach((id) => {
          if (itemsMapObject[id]) {
            responseData.push(itemsMapObject[id]);
          } else {
            notExistId = true;
          }
        });

        //If request has non exist fileid then set notExistId return error.
        reject(
          notExistId
            ? new Error("File id not found!!!")
            : { items: responseData }
        );
      });

      //Clear requests.
      clearRequests(url);
    })
    .catch((err) => {
      _requests[url].forEach(({ reject }) => {
        reject(err);
      });
      clearRequests(url);
    });
};

/**
 * We used timeout to waiting another same requests.
 * If new request comes under REQUEST_WAITING_TIMEOUT time then timeout is refreshing and waiting more up to REQUEST_WAITING_TIMEOUT time.
 * If new request don't come then handleRequest is triggered.
 */
const setRefreshedTimeout = (url) => {
  if (_refreshedTimeouts[url]) {
    clearTimeout(_refreshedTimeouts[url]);
    _refreshedTimeouts[url] = null;
  }

  _refreshedTimeouts[url] = setTimeout(() => {
    handleRequests(url);
  }, REQUEST_WAITING_TIMEOUT);
};

/**
 *
 * @param {Object} instance axios instance.
 * @param {Array} batchInterceptorUrls string array of urls which will be processed by interceptor.
 */
function batchInterceptor(instance, batchInterceptorUrls = []) {
  instance.interceptors.request.use(
    (request) => {
      return new Promise((resolve, reject) => {
        //If request url is in the batchInterceptorUrls then pushing to stack. Otherwise resolve request.
        if (batchInterceptorUrls.includes(request.url)) {
          _requests[request.url] = _requests[request.url] || [];

          //Keep request, resolve and reject for using in the handleRequests
          _requests[request.url].push({
            request,
            resolve,
            reject,
          });

          setRefreshedTimeout(request.url);
        } else {
          request.url = `${request.host}${request.url}`;
          resolve(request);
        }
      });
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(null, (result) => {
    //If response getting error then throw that error.
    //Otherwise result is data which coming from handleRequests and return normally.
    if (result instanceof Error) {
      throw result;
    } else {
      return result;
    }
  });
}

export default batchInterceptor;
