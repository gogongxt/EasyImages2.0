/**
 * 来自于copy_btn.js paste.js合并
 * 简单图床-复制链接
 * 2023-04-20
 * @param {*} copyID  传入的ID
 * @param {*} loadClass 传入的class
 */
function uploadCopy(copyID, loadClass) {
    var copyVal = document.getElementById(copyID);
    copyVal.select();

    // 复制内容为空时的提示
    if (copyVal.value.length === 0) { new $.zui.Messager("复制内容为空", { type: "danger", icon: "bell" }).show(); return; }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(copyVal.value).then(function () {
            //success
            new $.zui.Messager("复制成功", { type: "primary", icon: "ok-sign" }).show();
        }, function () {
            //fail
            new $.zui.Messager("复制失败, 请手动复制", { type: "danger", icon: "bell" }).show();
        });
    } else {
        if (document.execCommand('copy', false, null)) {
            //success
            new $.zui.Messager("复制成功", { type: "primary", icon: "ok-sign" }).show();
        } else {
            //fail
            new $.zui.Messager("复制失败, 请手动复制", { type: "danger", icon: "bell" }).show();
        }
    }

    // 复制按钮状态
    var $btn = $(loadClass);
    $btn.addClass('btn-success');
    // $btn.addClass('btn-success load-indicator loading');
    $btn.remove('data-toggle data-original-title');
    $btn.button('loading');
    // 此处使用 setTimeout 来模拟复杂功能逻辑
    setTimeout(function () {
        $btn.removeClass('btn-success');
        // $btn.removeClass('btn-success load-indicator loading');
        $btn.button('reset');
    }, 666);
}

/**
 * 判断URL是否为图片链接
 * @param {string} url - 要检查的URL
 * @returns {boolean} - 是否为图片链接
 */
function isImageUrl(url) {
    if (!isUrl(url)) return false;
    // 检查URL是否包含常见图片扩展名，或者是常见的图片托管服务
    var imagePattern = /\.(jpeg|jpg|gif|png|bmp|webp|svg|ico)(\?.*)?$/i;
    // 常见图片托管服务和直接图片链接
    var imageHosts = [
        'i.imgur.com', 'imgur.com',
        'i.loli.net', 's2.loli.net',
        'cdn.v2ex.com',
        'images.unsplash.com', 'unsplash.com',
        'picsum.photos',
        'github.com', 'raw.githubusercontent.com',
        'gcore.jsdelivr.net', 'fastly.jsdelivr.net', 'cdn.jsdelivr.net',
        'cdn.cnpmjs.org'
    ];

    try {
        var urlObj = parseURL(url);
        // 检查是否有图片扩展名
        if (imagePattern.test(url)) {
            return true;
        }
        // 检查是否为已知的图片托管服务
        for (var i = 0; i < imageHosts.length; i++) {
            if (urlObj.host === imageHosts[i] || urlObj.host.endsWith('.' + imageHosts[i])) {
                return true;
            }
        }
    } catch (e) {
        return false;
    }
    return false;
}

/**
 * 从URL下载图片并返回File对象
 * @param {string} imageUrl - 图片URL
 * @returns {Promise<File>} - 图片文件对象
 */
function fetchImageFromUrl(imageUrl) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', imageUrl, true);
        xhr.responseType = 'blob';

        xhr.onload = function() {
            if (xhr.status === 200) {
                var blob = xhr.response;
                // 从URL中提取文件名或使用默认名称
                var fileName = 'pasted_image';
                try {
                    var urlObj = parseURL(imageUrl);
                    var pathParts = urlObj.path.split('/');
                    var lastPart = pathParts[pathParts.length - 1];
                    if (lastPart && lastPart.indexOf('.') !== -1) {
                        fileName = lastPart.split('.')[0];
                    }
                } catch (e) {
                    // 使用默认文件名
                }

                // 获取MIME类型
                var mimeType = blob.type || 'image/jpeg';
                var extension = mimeType.split('/')[1] || 'jpg';

                // 创建File对象
                var file = new File([blob], fileName + '.' + extension, { type: mimeType });
                resolve(file);
            } else {
                reject(new Error('下载图片失败，状态码: ' + xhr.status));
            }
        };

        xhr.onerror = function() {
            reject(new Error('网络错误，无法下载图片'));
        };

        // 设置超时
        xhr.timeout = 30000; // 30秒超时
        xhr.ontimeout = function() {
            reject(new Error('下载图片超时'));
        };

        xhr.send();
    });
}

/** 粘贴上传 2023-01-30 */
(function () {
    document.addEventListener('paste', function (e) {
        var items = ((e.clipboardData || window.clipboardData).items) || [];
        console.log(e)
        var file = null;
        var textData = '';

        // 首先检查剪贴板中的图片数据
        if (items && items.length) {
            for (var i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    file = items[i].getAsFile();
                    break;
                }
                // 同时获取文本数据
                if (items[i].type === 'text/plain') {
                    var item = items[i];
                    if (typeof item.getAsEntry === 'function') {
                        var entry = item.getAsEntry();
                        if (entry) {
                            textData = entry.fullPath;
                        }
                    }
                }
            }
        }

        // 获取剪贴板中的文本（可能包含图片URL）
        var clipboardText = (e.clipboardData || window.clipboardData).getData('text');

        // 如果没有找到图片文件，但有文本内容
        if (!file && clipboardText) {
            textData = clipboardText.trim();
        }

        // 如果找到了图片URL
        if (!file && textData && isImageUrl(textData)) {
            $("#upShowID").addClass("load-indicator loading");
            $.zui.messager.show('正在下载图片...', { icon: 'bell', time: 3000, type: 'primary', placement: 'top' });

            fetchImageFromUrl(textData).then(function(fetchedFile) {
                uploadPastedFile(fetchedFile);
            }).catch(function(error) {
                $("#upShowID").removeClass("load-indicator loading");
                $.zui.messager.show('下载图片失败: ' + error.message, { icon: 'bell', time: 4000, type: 'danger', placement: 'top' });
            });
            return;
        }

        // 如果有图片数据，直接上传
        if (file) {
            $("#upShowID").addClass("load-indicator loading"); // 增加正在上传状态 2-1
            uploadPastedFile(file);
            return;
        }

        // 未找到图片或图片URL
        if (textData) {
            $.zui.messager.show('检测到链接但非图片格式，请手动上传图片文件', { icon: 'bell', time: 4000, type: 'warning', placement: 'top' });
        } else {
            $.zui.messager.show('粘贴内容非图片!', { icon: 'bell', time: 3000, type: 'danger', placement: 'top' });
        }
    });
})();

/**
 * 上传粘贴的文件
 * @param {File} file - 要上传的文件
 */
function uploadPastedFile(file) {
    var formData = new FormData();
    formData.append('file', file);
    formData.append('sign', new Date().getTime() / 1000 | 0);
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 1) {
            $.zui.messager.show('粘贴上传中...', { icon: 'bell', time: 3000, type: 'primary', placement: 'top' });
        }
    }

    xhr.onload = function () {
        var obj = JSON.parse(this.responseText);
        if (obj.code === 200) {
            $("#links").append(obj.url + "\r\n");
            $("#bbscode").append("[img]" + obj.url + "[/img]\r\n");
            $("#markdown").append("![](" + obj.url + ")\r\n");
            $("#html").append('&lt;img src="' + obj.url + '" alt="' + obj.srcName + '" /&gt;\r\n');
            $("#thumb").append(obj.thumb + "\r\n");
            $("#del").append(obj.del + "\r\n");
            // 上传成功提示 原始文件名称obj.srcName + 提示
            $.zui.messager.show('粘贴上传成功', { icon: 'bell', time: 4000, type: 'success', placement: 'top' });
            // 移除正在上传状态 2-3
            $("#upShowID").removeClass("load-indicator loading");

            try { // 储存上传记录
                console.log('history localStorage success');
                $.zui.store.set(obj.srcName, obj)
            } catch (err) {
                // 存储上传记录失败提示
                $.zui.messager.show('存储上传记录失败' + err, { icon: 'bell', time: 4000, type: 'danger', placement: 'top' });
                console.log('history localStorage failed:' + err);
            }
        } else {
            $("#upShowID").removeClass("load-indicator loading"); // 移除正在上传状态 2-4
            $.zui.messager.show(obj.message, { icon: 'bell', time: 4000, type: 'danger', placement: 'top' });
        }
    };

    xhr.onerror = function () {
        $("#upShowID").removeClass("load-indicator loading"); // 移除正在上传状态 2-5
        $.zui.messager.show('因网络问题导致的上传失败...', { icon: 'bell', time: 4000, type: 'primary', placement: 'top' });
    };
    xhr.open('POST', 'app/upload.php', true);
    xhr.send(formData);
}


/** 检测浏览器是否支持cookie */
if (navigator.cookieEnabled === false) {
    new $.zui.Messager('浏览器不支持cookie, 无法保存登录信息', { type: 'black', icon: 'bell', time: 4500, placement: 'top' }).show();
    console.log('浏览器不支持cookie');
}

/** 检测浏览器是否支持本地存储 */
if ($.zui.store.enable === false) {
    new $.zui.Messager('浏览器不支持本地存储, 无法保存上传历史记录', { icon: 'bell', time: 4000, type: 'primary', placement: 'top' }).show();
    console.log('浏览器不支持本地存储');
}

/** 
 * javascript parseUrl函数解析url获取网址url参数 
 * https://www.cnblogs.com/lazb/p/10144471.html
 * 使用示例：
 * var myURL = parseURL('http://abc.com:8080/dir/index.html?id=255&m=hello#top');
 * myURL.file; // = 'index.html'
 * myURL.hash; // = 'top'
 * myURL.host; // = 'abc.com'
 * myURL.query; // = '?id=255&m=hello'
 * myURL.params; // = Object = { id: 255, m: hello }
 * myURL.path; // = '/dir/index.html'
 * myURL.segments; // = Array = ['dir', 'index.html']
 * myURL.port; // = '8080'
 * myURL.protocol; // = 'http'
 * myURL.source; // = 'http://abc.com:8080/dir/index.html?id=255&m=hello#top'
*/
function parseURL(url) {
    var a = document.createElement('a');
    a.href = url;
    return {
        source: url,
        protocol: a.protocol.replace(':', ''),
        host: a.hostname,
        port: a.port,
        query: a.search,
        params: (function () {
            var ret = {},
                seg = a.search.replace(/^\?/, '').split('&'),
                len = seg.length, i = 0, s;
            for (; i < len; i++) {
                if (!seg[i]) { continue; }
                s = seg[i].split('=');
                ret[s[0]] = s[1];
            }
            return ret;
        })(),
        file: (a.pathname.match(/\/([^\/?#]+)$/i) || [, ''])[1],
        hash: a.hash.replace('#', ''),
        path: a.pathname.replace(/^([^\/])/, '/$1'),
        relative: (a.href.match(/tps?:\/\/[^\/]+(.+)/) || [, ''])[1],
        segments: a.pathname.replace(/^\//, '').split('/')
    };
}

/**
 * jQuery 读取文件 readTxt('../admin/version.php');
 * @param {*} filePath 
 */
function readTxt(filePath = '../admin/version.php') {
    $.get(filePath, function (data) {
        var lines = data.split("\n"); //按行读取
        $.each(lines, function (i, v) {
            console.log(v);
        });
    });
}

/**
 * JS验证是否为URL 这是提取自：npm包 async-validator的源码。
 * 参考: https://www.cnblogs.com/lanleiming/p/14250497.html
 * @param {*} str
 * @returns
 * @example isUrl('http://www.baidu.com') // true
 */
function isUrl(str) {
    var v = new RegExp('^(?!mailto:)(?:(?:http|https|ftp)://|//)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$', 'i');
    return v.test(str);
}
