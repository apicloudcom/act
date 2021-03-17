import Toast from "./Toast";


export {Toast};

/**
 * 插槽支持
 * @param VNode
 * @param children
 * @param host
 */
export function slotSupport(VNode, children, host) {

    let slots = {
        default: []
    };

    const dfsScope = node => {
        if (node.nodeName === 'text' && node.attributes) {
            const text = node.children[0];
            if (node.attributes.scoped || (typeof text === 'string' && text.startsWith('[[') && text.endsWith(']]'))) {
                let path = text.replace(/[\[\]]/g, '').split(/[.[]/);
                if (node.attributes.scoped) {
                    path = node.attributes.scoped;
                } else {
                    node.attributes.scoped = path;
                }
                let data = host;
                path.forEach(p => data = data[p]);
                node.children[0] = JSON.stringify(data);
            }
        }

        if (Array.isArray(node.children) && node.children.length) {
            node.children.forEach(dfsScope);
        }
    }

    children.forEach(node => {
        if (node) {
            if (node.nodeName === 'template' && node.attributes && node.attributes._slot) {
                const slotInfo = node.attributes._slot.split(':');
                if (slotInfo.length === 2) {
                    node.attributes.scope = slotInfo[1];
                    node.attributes._slot = slotInfo[0];
                }
                slots[node.attributes._slot] = node;
            } else {
                slots.default.push(node);
            }
            dfsScope(node);
        }
    })


    if (Object.keys(slots).length === 1 && slots.default.length === 0) {
        // 没有 slot 项目 直接返回 不要再去查找组件
        return VNode;
    }

    const dfs = (node) => {
        if (node.attributes && node.attributes._slot) {
            if (slots[node.attributes._slot]) {
                node.children = slots[node.attributes._slot].children;
                node.attributes = Object.assign(slots[node.attributes._slot].attributes, node.attributes);
            }
            // delete node.attributes._slot;
        } else if (Array.isArray(node.children) && node.children.length) {
            node.children.forEach(dfs);
        }
    }
    dfs(VNode);


    return VNode;
}

/**
 * 继承父组件的 class 、style
 * @param VNode
 * @param props
 * @returns {*}
 */
export function extendsClassStyle(VNode, props) {
    props.class && (VNode.attributes.class += ' ' + props.class);
    props.style && (VNode.attributes.style = props.style);
    return VNode;
}

/**
 * 继承父组件的事件
 * @param VNode
 * @param props
 */
export function extendsEvent(VNode, props) {
    Object.entries(props)
        .filter(item => item[0].startsWith('on'))//筛选on开头的属性
        .map(item => [item[0].replace(/-(\w)/g, ($, $1) => $1.toUpperCase()), item[1]])//统一写成驼峰形式
        .forEach(([ev, fn]) => VNode.attributes[ev] = fn);//绑定到子组件上
}


/**
 * 超级节点
 * @param VNode
 * @param props
 * @returns {*}
 */
export function superNode(VNode, props) {
    slotSupport(VNode, props.children)
    extendsClassStyle(VNode, props);
    // extendsEvent(VNode, props);
    // console.log('superNode', VNode)
    return VNode;
}

/**
 * 通用api.openWin打开页面
 * @param to
 * @param title 标题
 * @returns {*}
 */
export function linkTo(to, title) {
    let options = {};
    if (typeof to === 'string') {
        if (to.endsWith('.stml')) {
            options.name = title || to.split('/').pop().replace('.stml', '');
            options.url = to;
        } else {
            options.name = title || to;
            options.url = `../${to}/${to}.stml`;
        }
    } else {
        options = to;
    }

    if (!options.bgColor) options.bgColor = '#FFF';

    console.log(['a-link:to', JSON.stringify(options)]);
    return api.openWin(options);
}


/**
 * 混合class类
 * @param cls
 * @param extra
 * @returns {string}
 */
export function mixedClass(cls, extra) {
    if (!extra) {
        return cls;
    } else {
        let classList = [cls];
        Object.entries(extra).forEach(([key, val]) => val && classList.push(key));
        return classList.join(' ');
    }
}

/**
 * v-model 双向绑定模拟
 * @returns {{}}
 */
export function syncModel() {
    const $model = {};
    const {props} = this;
    let {_host} = this;
    Object.entries(props).forEach(([k, v]) => {
        if (k.startsWith('$')) {
            const path = v.replace(/]/g, '').split(/[.[]/);
            while (typeof _host.data[path[0]] === 'undefined') {
                if (_host._host) {
                    _host = _host._host;
                } else {
                    break;
                }
            }
            let data = _host.data;
            const lastKey = path.pop();
            path.forEach(p => data = data[p]);
            $model[k.substr(1)] = value => {
                return value === undefined ? data[lastKey] : data[lastKey] = value;
            };
        }
    });
    this.$model = $model;
}

export function dateFormat(fmt, date) {
    let ret;
    const opt = {
        "Y+": date.getFullYear().toString(),        // 年
        "m+": (date.getMonth() + 1).toString(),     // 月
        "d+": date.getDate().toString(),            // 日
        "H+": date.getHours().toString(),           // 时
        "M+": date.getMinutes().toString(),         // 分
        "S+": date.getSeconds().toString()          // 秒
        // 有其他格式化字符需求可以继续添加，必须转化成字符串
    };
    for (let k in opt) {
        ret = new RegExp("(" + k + ")").exec(fmt);
        if (ret) {
            fmt = fmt.replace(ret[1], (ret[1].length === 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, "0")))
        }
    }
    return fmt;
}

/**
 * 月份比较
 * @param date1
 * @param date2
 * @returns {number}
 */
export function compareMonth(date1, date2) {
    const year1 = date1.getFullYear();
    const year2 = date2.getFullYear();
    const month1 = date1.getMonth();
    const month2 = date2.getMonth();

    if (year1 === year2) {
        return month1 === month2 ? 0 : month1 > month2 ? 1 : -1;
    }

    return year1 > year2 ? 1 : -1;
}

/**
 * 日期比较
 * @param day1
 * @param day2
 * @returns {number}
 */
export function compareDay(day1, day2) {
    // const compareMonthResult = compareMonth(day1, day2);
    //
    // if (compareMonthResult === 0) {
    //     const date1 = day1.getDate();
    //     const date2 = day2.getDate();
    //
    //     return date1 === date2 ? 0 : date1 > date2 ? 1 : -1;
    // }
    return (day1 - day2) / 86400000;
}

/**
 * 附件路径
 * @param name
 * @returns {string}
 */
export function asset(name) {
    return `../../components/act/asset/${name}`;
}

/**
 * 倒计时组件使用的格式化代码
 * @param format
 * @param currentTime
 * @returns {*}
 */
export function parseFormat(format, currentTime) {
    const {days} = currentTime;
    let {hours, minutes, seconds, milliseconds} = currentTime;

    if (format.indexOf('DD') === -1) {
        hours += days * 24;
    } else {
        format = format.replace('DD', padZero(days));
    }

    if (format.indexOf('HH') === -1) {
        minutes += hours * 60;
    } else {
        format = format.replace('HH', padZero(hours));
    }

    if (format.indexOf('mm') === -1) {
        seconds += minutes * 60;
    } else {
        format = format.replace('mm', padZero(minutes));
    }

    if (format.indexOf('ss') === -1) {
        milliseconds += seconds * 1000;
    } else {
        format = format.replace('ss', padZero(seconds));
    }

    if (format.indexOf('S') !== -1) {
        const ms = padZero(milliseconds, 3);

        if (format.indexOf('SSS') !== -1) {
            format = format.replace('SSS', ms);
        } else if (format.indexOf('SS') !== -1) {
            format = format.replace('SS', ms.slice(0, 2));
        } else {
            format = format.replace('S', ms.charAt(0));
        }
    }

    return format;
}

/**
 * 补齐 0
 * @param num
 * @param targetLength
 * @returns {string}
 */
export function padZero(num, targetLength = 2) {
    let str = num + '';
    while (str.length < targetLength) {
        str = '0' + str;
    }
    return str;
}


const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * 转换时间
 * @param time
 * @returns {{milliseconds: number, total, hours: number, seconds: number, minutes: number, days: number}}
 */
export function parseTime(time) {
    const days = Math.floor(time / DAY);
    const hours = Math.floor((time % DAY) / HOUR);
    const minutes = Math.floor((time % HOUR) / MINUTE);
    const seconds = Math.floor((time % MINUTE) / SECOND);
    const milliseconds = Math.floor(time % SECOND);

    return {
        total: time,
        days,
        hours,
        minutes,
        seconds,
        milliseconds,
    };
}
