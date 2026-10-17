
// example.js
// https://raw.githubusercontent.com/iiplayer/Example/refs/heads/main/example.js
// 如有问题请前往上面链接查看是否有更新
// iPlayer (Version >= 2.0.0)

/**
 * 引擎入口主函数
 * @param {number} number - 页面层级 (从1开始)
 * @param {number} index  - 父级列表点击的索引 (从0开始)
 * @param {number} page   - 触发的分页页码 (从0开始)
 */
async function iPlayerMain(number, index, page) {
    try {
        // App版本号
        console.log("App版本号:", version());
        
        // 等待样式HUD
        iUI.showHUD('wait', '加载中...');
        
        await wait(2000); // 等待2秒
        
        let times = new Date();
        let data = {
            title: "EXAMPLE", // 页面导航栏标题
            canPlay: true, // 当前页面数据是否支持播放
            mutableDuty: true, // 是否显示多任务按钮
            // 明文列表数据
            data: [{
                name: "example", // 名称
                plat: "m3u8", // 平台
                image: "https://github.com/iiplayer/Example/blob/main/icon.png?raw=true", // 封面
                address: "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8", //播放地址
                time: times.toLocaleDateString(), // 添加时间
                hot: "999", // 热度
                type: "1", // 类型（1: 显示门票图标；2: 显示时钟图标）
                typeInfo: "类型信息", // 显示在类型图标后面
                typeImage: "https://github.com/iiplayer/Example/blob/main/icon.png?raw=true", // 自定义类型图标（优先级高于type，可以使用iOS系统图标直接填入图标名称字符串）
                typeColor: "类型图片颜色", // 类型图标颜色
            },
            {
                name: "alert example",
                plat: "alert",
                address: "",
                time: times.toLocaleDateString(),
                // 是否跳转至下一页（如果address有效则忽略）
                pushNext: false
            }]
            // 密文列表数据
            //sign: dynamicSignKey,        // 必须为 String: 解密密钥（通过app内设置->url-scheme生成）
            //data: encryptedStringFromNet // 必须为 String: 密文载荷（由上述密钥加密的数据）
        }
        
        console.log(`numben(页面)：${number}; index(选择项)：${index}; page(页码)：${page}`);
        console.log(JSON.stringify(data));
        
        iUI.clearAllHUD(); // 移除HUD
        iUI.reloadData(data); // 刷新页面
        
        iNotify.notify("iPlayer", "获取数据成功", "▶点击播放", {"open-url": data.data[0].address, "media-url":'https://github.com/iiplayer/Example/blob/main/icon.png?raw=true'});
                
    } catch(err) {
        iUI.clearAllHUD();
        iUI.showHUD('error', `脚本异常: ${err.message}`);
        console.log(`❌ 运行时错误: ${err.stack || err}`);
    }
}

/**
 * 列表点击事件拦截 (用于子层级分发)
 * @param {object} arg - 包含 number 和 index 的参数字典
 */
async function iPlayerDidSelectIndexPath(arg) {
    // iUI.showHUD('info', `点击了第${arg.number}个页面的\n第${arg.index}个cell`)
    if(arg.index == 0) return
    iUI.alert('Title', `message`, ['取消:cancel', '红色:destructive', '输入框1:textField', '输入框2:textField', '普通', '播放'],(index, title, textFileds)=>{
        console.log(index, title, textFileds)
        if (title == '播放') {
            iUI.play('https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8')
        }
    })
}

/**
 * 协程睡眠辅助函数
 */
async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 版本号
function version() {
    try {
        return iUI.appVersion()
    }catch(e){}
    return ''
}

/**
 * 封装底层的网络请求为 Promise
 * @param {string} method - 'get' 或 'post'
 * @param {object} options - 请求配置
 * @returns {Promise<any>}
 */
function requestAsync(method, options) {
    return new Promise((resolve, reject) => {
        iNetwork[method](options, function(err, res, body) {
            if (err) {
                reject(new Error(err));
                return;
            }
            resolve({ res, body });
        });
    });
}

async function getData() {
    let options = {
        url: "http://example.php?key=value",
        headers: {}, // 设置请求头
        timeout: 16
    };
    
    try {
        let { res, body } = await requestAsync('get', options);
        console.log("GET 请求成功:", body);
    } catch (error) {
        console.log("GET 请求失败:", error.message);
    }
}

async function postData() {
    let param = { key: 'value' };
    let options = {
        url: "http://example.php",
        headers: {}, // 设置请求头
        body: param, // POST 请求可以携带 body，底层会自动序列化为 JSON
        timeout: 16
    };
    
    try {
        let { res, body } = await requestAsync('post', options);
        console.log("POST 请求成功:", body);
    } catch (error) {
        console.log("POST 请求失败:", error.message);
    }
}

/*
 // 本地推送
 iNotify.notify("Title", "subtitle", "detail", {"open-url": 'https://www.baidu.com', "media-url":'https://s3.bmp.ovh/imgs/2022/06/03/b00eeb1ee998105e.png'})
 
 // 显示HUD
 iUI.showHUD('wait', '等待样式')
 iUI.showHUD('succ', '成功样式')
 iUI.showHUD('error', '失败样式')
 iUI.showHUD('info', '显示信息')
 // 清除HUD
 iUI.clearAllHUD()
 
 // 跳转至播放器（版本>=1.5.3可用）
 iUI.play('rtmp://xxx')
 
 // 获取版本号（版本>=1.5.0可用）
 iUI.appVersion()
 
 // 数据持久化
 // 读取key对应的数据
 iUI.read('key')
 // 删除key对应的数据
 iUI.remove('key')
 // 写入数据key相同会覆盖
 iUI.write('value', 'key')
 
 */

