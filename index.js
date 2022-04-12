const {
    default: axios
} = require('axios');

// let goodsList = [{"isSelected":true,"quantity":1,"spuId":"1280319","storeId":"4807"},{"isSelected":true,"quantity":1,"spuId":"17417219","storeId":"4807"},{"isSelected":true,"quantity":1,"spuId":"1280996","storeId":"4807"},{"isSelected":true,"quantity":1,"spuId":"1282134","storeId":"4807"},{"isSelected":true,"quantity":1,"spuId":"1283358","storeId":"4807"},{"isSelected":true,"quantity":1,"spuId":"8609752","storeId":"4807"},{"isSelected":true,"quantity":1,"spuId":"10414466","storeId":"4807"},{"isSelected":true,"quantity":1,"spuId":"1282975","storeId":"4807"},{"isSelected":true,"quantity":1,"spuId":"1279223","storeId":"4807"},{"isSelected":true,"quantity":1,"spuId":"1380023","storeId":"4807"},{"isSelected":true,"quantity":1,"spuId":"1277934","storeId":"4807"}];


/**
 * 注意！！！！
 * 1、抓包的信息，可能在请求request的header里面，可能在body里面，仔细找找
 * 
 * 
 * 2、抓包getCapacityData接口，把返回值 dateISFull、timeISFull都改为false，就可以在App上选择时间，就可以模拟下单
 * 
 * 3、把所有信息通过抓包都获取后，启动脚本 node index.js，静等抢购成功
 * 
 * 4、不可并发太高，会被拦截！！！！
 */

let goodsList = [];
let amount = 0;
let errorNum = 0;

// 修改点1： 结算页面，点击配送时间 -> /getCapacityData抓包 填写下面值
const longitude = ''
const latitude = ''
const deviceid = ''
const authtoken = ''
const uid = '';
const storeDeliveryTemplateId = '';

const headers = {
    'Host': 'api-sams.walmartmobile.cn',
    'Connection': 'keep-alive',
    'Accept': '*/*',
    'Content-Type': 'application/json;charset=UTF-8',
    // 'Content-Length': '155',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'User-Agent': 'SamClub/5.0.45 (iPhone; iOS 15.4; Scale/3.00)',
    'device-name': 'iPhone14,3',
    'device-os-version': '15.4',
    'device-id': deviceid,
    'longitude': longitude,
    'latitude': latitude,
    'device-type': 'ios',
    'auth-token': authtoken,
    'app-version': '5.0.45.1'

}

// 修改点2： 结算页面点击下单 -> /commitPay 抓包填写下面值
// 把getCapacityData接口的response.body里一些关于库存的true或false修改一下就可以进入到commitPay方法获取trackinfo和data
const trackinfo = ''



const getCart = async () => {
    let url = 'https://api-sams.walmartmobile.cn/api/v1/sams/trade/cart/getUserCart';

    let data = {
        "uid": uid,
        "deliveryType": "0",
        "deviceType": "ios",
        // 修改点：抓包 /getUserCart 修改下面的storeList
        "storeList": [{
            "storeType": "32",
            "storeId": "9991",
            "areaBlockId": "857774288089043222",
            "storeDeliveryTemplateId": "1010425035346829590",
            "deliveryModeId": "1014"
        }, {
            "storeType": "2",
            "storeId": "4807",
            "areaBlockId": "300155615311965462",
            "storeDeliveryTemplateId": "552578721878546198",
            "deliveryModeId": "1003"
        }, {
            "storeType": "8",
            "storeId": "9996",
            "areaBlockId": "42295",
            "storeDeliveryTemplateId": "1147161263885953814",
            "deliveryModeId": "1010"
        }],
        "parentDeliveryType": 1,
        "homePagelongitude": longitude,
        "homePagelatitude": latitude
    }

    try {
        let ret = await axios.post(url, data, {
            headers
        });
        console.log('【购物车】商品获取成功');
        let {
            floorInfoList
        } = ret.data.data;

        let {
            normalGoodsList,
            amount,
            quantity
        } = floorInfoList[0];
        if (amount == 0) {
            getCart();
            return;
        }

        console.log(`【购物车】共 ${quantity} 件商品，共 ${amount / 100} 元`)
        amount = amount;
        goodsList = normalGoodsList.map(item => {
            return {
                "isSelected": true,
                "quantity": item.quantity,
                "spuId": item.spuId,
                "storeId": item.storeId
            }
        });
        getCapacityData();
    } catch (e) {
        console.error('【购物车】商品获取失败', e);
        getCart();
        errorNum++;
    }
}

const getCapacityData = async () => {
    let url = 'https://api-sams.walmartmobile.cn/api/v1/sams/delivery/portal/getCapacityData';

    let data = {
        // 修改点3：填自己的
        perDateList: ["2022-04-11", "2022-04-12", "2022-04-13", "2022-04-14", "2022-04-15", "2022-04-16", "2022-04-17"],
        "storeDeliveryTemplateId": storeDeliveryTemplateId
    }

    try {
        const ret = await axios.post(url, data, {
            headers
        });
        let {
            capcityResponseList
        } = ret.data.data;
        let time = capcityResponseList[0].list[0];
        let {
            startRealTime,
            endRealTime,
            closeDate,
            startTime,
            endTime
        } = time;
        console.log(`【成功】获取配送时间：${closeDate} ${startTime} - ${endTime}`);
        console.log(`【开始下单】`);
        order(startRealTime, endRealTime);
        order(startRealTime, endRealTime);
    } catch (error) {
        console.error(`【获取配送时间失败】`, error);
        getCapacityData();
        errorNum++;
    }
}

const order = async (startRealTime, endRealTime) => {
    let url = 'https://api-sams.walmartmobile.cn/api/v1/sams/trade/settlement/commitPay'

    // 修改点： start ---------
    let data = {
        "invoiceInfo": {},
        "cartDeliveryType": 2,
        "floorId": 1,
        "amount": amount,
        "purchaserName": "",
        "tradeType": "APP",
        "purchaserId": "",
        "payType": 0,
        "currency": "CNY",
        "channel": "wechat",
        "shortageId": 1,
        "isSelfPickup": 0,
        "orderType": 0,
        "uid": uid,
        "appId": "wx57364320cb03dfba",
        "addressId": "145599136",
        "deliveryInfoVO": {
            "storeDeliveryTemplateId": storeDeliveryTemplateId,
            "deliveryModeId": "1003",
            "storeType": "2"
        },
        "remark": "",
        "storeInfo": {
            "storeId": "4807",
            "storeType": "2",
            "areaBlockId": "300155615311965462"
        },
        "shortageDesc": "其他商品继续配送（缺货商品直接退款）",
        "payMethodId": "1486659732",

        // 上面的信息，先自己点击支付，抓包commitPay，把上面的信息，都换成自己的

        // 修改点 end ------------

        // 下面别动

        goodsList: goodsList,
        "settleDeliveryInfo": {
            "expectArrivalTime": startRealTime,
            "expectArrivalEndTime": endRealTime,
            "deliveryType": 0
        },
    }

    try {
        let ret = await axios.post(url, data, {
            headers: {
                ...headers,
                "track-info": trackinfo,
            }
        })
        let {
            success,
            msg
        } = ret.data;
        if (success) {
            console.log('【抢到菜了】')
        } else {
            console.log(msg);
            errorNum++;
            order(startRealTime, endRealTime)
        }
    } catch (e) {
        console.error(e)
    }
}

module.exports = {
    getCart: getCart
}

getCart();