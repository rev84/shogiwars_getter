// Generated by CoffeeScript 2.3.1
var Board;

Board = class Board {
  constructor(csa1) {
    this.csa = csa1;
  }

};

window.db = null;

window.isGettingList = false;

window.gType = null;

window.getKifuData = {};

window.url = null;

// 終局表現
window.ENDING = {
  TIME_UP: ['SENTE_WIN_DISCONNECT', 'SENTE_WIN_TIMEOUT', 'GOTE_WIN_DISCONNECT', 'GOTE_WIN_TIMEOUT'],
  SENTE_ILLEGAL_MOVE: ['GOTE_WIN_OUTE_SENNICHI'],
  GOTE_ILLEGAL_MOVE: ['SENTE_WIN_OUTE_SENNICHI'],
  SENNICHITE: ['DRAW_SENNICHI'],
  TORYO: ['SENTE_WIN_TORYO', 'GOTE_WIN_TORYO'],
  TSUMI: ['SENTE_WIN_CHECKMATE', 'GOTE_WIN_CHECKMATE'],
  KACHI: ['SENTE_WIN_ENTERINGKING', 'GOTE_WIN_ENTERINGKING']
};

$().ready(function() {
  var checked, id, j, len, onCheckboxChange, ref, user;
  // DB
  window.db = new Utl.IndexedDB();
  $(':checkbox').radiocheck();
  user = Utl.getLs('USERNAME');
  if (user === null) {
    $('#modal_change_user').modal();
  } else {
    $('#user_name_input').val(user);
    window.getIndexes(user);
  }
  $('#start').on('click', function() {
    return window.setUser($('#user_name_input').val());
  });
  $('#open_user').on('click', function() {
    if (!window.isGettingList) {
      return $('#modal_change_user').modal();
    }
  });
  // チェック状態の保存
  onCheckboxChange = async function() {
    Utl.setLs('CHECKED_' + $(this).attr('id'), $(this).prop('checked'));
    return (await window.draw());
  };
  $('#10m, #sb, #s1').on('change', onCheckboxChange);
  ref = ['10m', 'sb', 's1'];
  // 復元
  for (j = 0, len = ref.length; j < len; j++) {
    id = ref[j];
    checked = Utl.getLs('CHECKED_' + id);
    if (checked !== null) {
      $('#' + id).prop('checked', checked);
    }
    onCheckboxChange($('#' + id));
  }
  
  // メッセージ内の×ボタンクリックでメッセージを非表示にする
  return $('.alert .close').on('click', function() {
    return $(this).parents('.alert').hide();
  });
});

window.setUser = function(user) {
  Utl.setLs('USERNAME', user);
  return window.getIndexes(user);
};

window.getKifu = function(url) {
  console.log(url);
  return $.getJSON('http://localhost:7777/' + url).done(function(r) {
    return window.getKifuCallbackSuccess(r);
  }).fail(function() {
    return window.getKifuCallbackFail(url);
  });
};

window.getKifuCallbackFail = function(url) {
  return window.getKifu(url);
};

window.getKifuCallbackSuccess = async function(response) {
  var csa, dbrec, kifuName, res, sw, url;
  url = response['url'];
  res = response['response'];
  kifuName = window.url2kifuName(url);
  sw = res.match(/receiveMove\("([^"]+)"\);/)[1].split("\t");
  // DBに保存
  dbrec = (await window.db.get(kifuName));
  csa = window.sw2csa(sw, dbrec);
  dbrec.csa = csa;
  return (await window.db.set(kifuName, dbrec));
};

window.sw2csa = function(sw, dbrec) {
  var buf, game_type, isFirst, j, len, name, rest, restTime, restTimes, s, te;
  game_type = (function() {
    switch (dbrec.game_type) {
      case 's1':
        return '10秒';
      case 'sb':
        return '3分';
      default:
        return '10分';
    }
  })();
  buf = '';
  // バージョン
  buf += 'V2.2' + "\n";
  // 対局者名
  buf += 'N+' + dbrec.sente.name + '(' + dbrec.sente.rank + ")\n";
  buf += 'N-' + dbrec.gote.name + '(' + dbrec.gote.rank + ")\n";
  // 対局場所
  buf += '$SITE:将棋ウォーズ(' + game_type + ')' + "\n";
  // 持ち時間
  buf += '$TIME_LIMIT:';
  buf += (function() {
    switch (game_type) {
      case '10秒':
        return '00:00+10';
      case '3分':
        return '00:03+00';
      default:
        return '00:10+00';
    }
  })();
  buf += "\n";
  // 平手の局面
  buf += 'PI' + "\n";
  // 先手番
  buf += "+\n";
  // 指し手と消費時間
  restTime = (function() {
    switch (game_type) {
      case '10秒':
        return 60 * 60;
      case '3分':
        return 60 * 3;
      default:
        return 60 * 10;
    }
  })();
  restTimes = {
    sente: restTime,
    gote: restTime
  };
  for (j = 0, len = sw.length; j < len; j++) {
    s = sw[j];
    if (window.ENDING.TIME_UP.indexOf(s) >= 0) {
      buf += "%TIME_UP\n";
    } else if (window.ENDING.SENTE_ILLEGAL_MOVE.indexOf(s) >= 0) {
      buf += "%-ILLEGAL_ACTION\n";
    } else if (window.ENDING.GOTE_ILLEGAL_MOVE.indexOf(s) >= 0) {
      buf += "%+ILLEGAL_ACTION\n";
    } else if (window.ENDING.SENNICHITE.indexOf(s) >= 0) {
      buf += "%+ILLEGAL_ACTION\n";
    } else if (window.ENDING.TORYO.indexOf(s) >= 0) {
      buf += "%TORYO\n";
    } else if (window.ENDING.KACHI.indexOf(s) >= 0) {
      buf += "%KACHI\n";
    } else if (window.ENDING.TSUMI.indexOf(s) >= 0) {
      buf += "%TSUMI\n";
    } else {
      //console.log(s)
      [te, rest] = s.split(',');
      isFirst = te.substr(0, 1) === '+';
      rest = Number(rest.substr(1));
      buf += te + "\n";
      name = isFirst ? 'sente' : 'gote';
      buf += 'T' + (restTimes[name] - rest) + "\n";
      restTimes[name] = rest;
    }
  }
  return buf;
};

window.finish = function() {
  console.log('finished.');
  window.draw();
  return window.isGettingList = false;
};

window.draw = async function() {
  var dt, game_type, game_type_class, is_first, is_friend, is_win, j, len, my_name, my_rank, op_name, op_rank, res, results, results1, tbody, tr, url;
  results = (await window.getMine());
  results.sort(function(a, b) {
    return b.date - a.date;
  });
  $('#user_name').html(window.myName);
  tbody = $('#result').find('table').find('tbody');
  tbody.html('');
  results1 = [];
  for (j = 0, len = results.length; j < len; j++) {
    res = results[j];
    if (res.sente.name === window.myName) {
      is_win = res.win === 0 ? 1 : 0;
      is_first = true;
      my_rank = res.sente.rank;
      my_name = res.sente.name;
      op_rank = res.gote.rank;
      op_name = res.gote.name;
    } else {
      is_win = res.win === 1 ? 1 : 0;
      is_first = false;
      my_rank = res.gote.rank;
      my_name = res.gote.name;
      op_rank = res.sente.rank;
      op_name = res.sente.name;
    }
    if (res.win === 2) {
      is_win = 2;
    }
    is_friend = res.is_friend;
    url = res.url;
    game_type = (function() {
      switch (res.game_type) {
        case 'sb':
          return '3分';
        case 's1':
          return '10秒';
        default:
          return '10分';
      }
    })();
    game_type_class = (function() {
      switch (res.game_type) {
        case 'sb':
          return 'm3';
        case 's1':
          return 'm10';
        default:
          return 's10';
      }
    })();
    dt = window.dateFormat(res.date);
    tr = $('<tr>').append($('<td>').addClass(is_win === 1 ? 'win' : is_win === 0 ? 'lose' : 'draw').html(my_name)).append($('<td>').addClass('center').html(my_rank)).append($('<td>').addClass(is_first ? 'sente' : 'gote').html(is_first ? '先' : '')).append($('<td>').addClass(is_first ? 'gote' : 'sente').html(is_first ? '' : '先')).append($('<td>').addClass('center').html(op_rank + (is_friend ? '<br><span class="label label-danger">友達</span>' : ''))).append($('<td>').addClass(is_win === 1 ? 'lose' : is_win === 0 ? 'win' : 'draw').html(op_name)).append($('<td>').addClass(game_type_class).html(game_type)).append($('<td>').addClass('center').html(dt)).append($('<td>').addClass('center').append($('<button>').addClass('btn btn-sm btn-primary').attr('dt-key', res.kifu_name).html('コピー').on('click', async function() {
      var rec;
      rec = (await window.db.get($(this).attr('dt-key')));
      return window.execCopy(rec.csa);
    })).append($('<a>').addClass('btn btn-sm btn-info').attr('href', res.url).attr('target', 'wars').html('棋譜')));
    results1.push(tbody.append(tr));
  }
  return results1;
};

window.getIndexes = function(userName) {
  if (window.isGettingList) {
    return;
  }
  window.isGettingList = true;
  window.myName = userName;
  window.gTypes = ['', 'sb', 's1'];
  return window.getIndex();
};

window.getIndex = function() {
  var url;
  if (window.gTypes.length <= 0) {
    return window.finish();
  }
  window.gType = window.gTypes.pop();
  url = 'https://shogiwars.heroz.jp/users/history/' + window.myName + '/web_app?locale=ja';
  if (gType !== '') {
    url += '&gtype=' + gType;
  }
  return window.getIndexCall('http://localhost:7777/' + url);
};

window.getIndexCall = function(url = null) {
  if (url !== null) {
    window.url = url;
  }
  console.log(window.url);
  return $.getJSON(window.url).done(function(r) {
    return window.getIndexCallbackSuccess(r);
  }).fail(function() {
    return window.getIndexCallbackFail();
  });
};

window.getIndexCallbackFail = function() {
  return window.getIndexCall();
};

window.getIndexCallbackSuccess = async function(response) {
  var a, content, div, doc, isExistAlreadyGot, isFirst, isFriend, isNext, isWin, j, key, l, len, len1, len2, len3, name, o, parser, player, q, rank, ref, ref1, ref2, ref3, result, stored, url;
  // 既に取得した棋譜があるか
  isExistAlreadyGot = false;
  parser = new DOMParser();
  doc = parser.parseFromString(response['response'], "text/html");
  ref = doc.getElementsByClassName('contents');
  for (j = 0, len = ref.length; j < len; j++) {
    content = ref[j];
    result = {};
    
    // 千日手パターン
    result.win = 2;
    // 対戦者の情報
    isFirst = true;
    ref1 = content.getElementsByClassName('history_prof');
    for (l = 0, len1 = ref1.length; l < len1; l++) {
      player = ref1[l];
      [name, rank] = player.getElementsByTagName('table')[0].getElementsByTagName('td')[1].innerText.split(" ");
      isWin = player.classList.contains('win');
      if (isFirst) {
        result.sente = {
          name: name,
          rank: rank
        };
      } else {
        result.gote = {
          name: name,
          rank: rank
        };
      }
      if (isWin) {
        result.win = isFirst ? 0 : 1;
      }
      isFirst = false;
    }
    // 時刻
    result.date = result.win === 2 ? new Date(content.getElementsByTagName('div')[3].innerText) : new Date(content.getElementsByTagName('div')[4].innerText);
    // 棋譜のURL
    result.url = 'https:' + content.getElementsByClassName('short_btn1')[0].getElementsByTagName('a')[0].getAttribute('href');
    // 友達対戦であるか
    isFriend = false;
    ref2 = content.getElementsByTagName('div');
    for (o = 0, len2 = ref2.length; o < len2; o++) {
      div = ref2[o];
      if (div.innerText === '友達') {
        isFriend = true;
        break;
      }
    }
    result.is_friend = isFriend;
    // 持ち時間タイプ
    result.game_type = window.gType;
    // IndexedDBにあるか見る
    key = window.url2kifuName(result.url);
    stored = (await window.db.get(key));
    if (stored === null) {
      await window.db.set(key, result);
      // 棋譜も取ってしまう
      window.getKifu(result.url);
    } else {
      // 取得済みの棋譜がある
      isExistAlreadyGot = true;
    }
  }
  // 次のページがあればそれも取得
  isNext = false;
  ref3 = doc.getElementsByTagName('a');
  for (q = 0, len3 = ref3.length; q < len3; q++) {
    a = ref3[q];
    if (!($('#only1page').prop('checked')) && (a.innerText === '次へ>>' || a.innerText === '次へ&gt;&gt;')) {
      // 取得済みの棋譜がないなら次のページも見る
      if (!isExistAlreadyGot) {
        url = 'https://shogiwars.heroz.jp' + $(a).attr('href');
        window.getIndexCall('http://localhost:7777/' + url);
        isNext = true;
        break;
      }
    }
  }
  if (!isNext) {
    // 次のページがなければ次のゲームモード
    return window.getIndex();
  }
};

window.dateFormat = function(dt) {
  /*
  m = ('0' + m).slice(-2)
  d = ('0' + d).slice(-2)
  */
  var d, h, i, m, s, w, wNames, y;
  if (typeof dt === 'string') {
    dt = new Date(dt);
  }
  y = dt.getFullYear();
  m = dt.getMonth() + 1;
  d = dt.getDate();
  w = dt.getDay();
  h = dt.getHours();
  i = dt.getMinutes();
  s = dt.getSeconds();
  wNames = ['日', '月', '火', '水', '木', '金', '土'];
  h = ('0' + h).slice(-2);
  i = ('0' + i).slice(-2);
  s = ('0' + s).slice(-2);
  return m + '/' + d + ' ' + h + ':' + i;
};

window.execCopy = function(string) {
  var result, s, temp;
  temp = document.createElement('div');
  temp.appendChild(document.createElement('pre')).textContent = string;
  s = temp.style;
  s.position = 'fixed';
  s.left = '-100%';
  document.body.appendChild(temp);
  document.getSelection().selectAllChildren(temp);
  result = document.execCommand('copy');
  document.body.removeChild(temp);
  return $('.alert').fadeIn(500).delay(1000).fadeOut(1000);
};

window.url2kifuName = function(url) {
  var spl;
  spl = url.split('/');
  return spl[spl.length - 1].replace(/\?.*$/g, '');
};

window.getMine = async function() {
  /*
  for key in keys
    res = await window.db.get key
    console.log(''+count+'件ロード') if ++count % 10 is 0
    res.date = new Date(res.date)
    res.kifu_name = key
    results.push res if [res.sente.name, res.gote.name].indexOf(window.myName) >= 0
  results
  */
  var count, is10m, is10s, is3m, k, keys, res, results, v;
  results = [];
  keys = (await window.db.getAllKeys());
  count = 0;
  res = (await window.db.gets(keys));
  is10m = $('#10m').prop('checked');
  is3m = $('#sb').prop('checked');
  is10s = $('#s1').prop('checked');
  for (k in res) {
    v = res[k];
    v.date = new Date(v.date);
    v.kifu_name = k;
    if ([v.sente.name, v.gote.name].indexOf(window.myName) >= 0) {
      if ((is10m && v.game_type === '') || (is3m && v.game_type === 'sb') || (is10s && v.game_type === 's1')) {
        results.push(v);
      }
    }
  }
  return results;
};

window.Utl = (function() {
  class Utl {
    //###########################################

    // 数値にカンマを入れる

    // @param Number num
    // @return String

    //###########################################
    static numFormat(num) {
      return String(num).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
    }

    //###########################################

    // min <= n <= max の整数乱数を生成

    // @param Number min
    // @param Number max
    // @return String

    //###########################################
    static rand(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    //###########################################

    // length 文字のランダムな文字列を生成

    // @param Number length
    // @return String

    //###########################################
    static genPassword(length = 4) {
      var chars, i, j, ref, res;
      chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      res = '';
      for (i = j = 0, ref = length; (0 <= ref ? j < ref : j > ref); i = 0 <= ref ? ++j : --j) {
        res += chars.substr(this.rand(0, chars.length - 1), 1);
      }
      return res;
    }

    //###########################################

    // アドレスバーを変更

    // @param String url
    // @return String

    //###########################################
    static adrBar(url) {
      return window.history.replaceState('', '', '' + url);
    }

    //###########################################

    // getクエリを取得

    // @return Object

    //###########################################
    static getQuery(key = null, defaultValue = null) {
      var j, k, len, p, params, query, res, v;
      query = document.location.search.substring(1);
      params = query.split('&');
      res = {};
      for (j = 0, len = params.length; j < len; j++) {
        p = params[j];
        [k, v] = p.split('=');
        res[k] = v;
      }
      if (key === null) {
        return res;
      }
      if (res[key] != null) {
        return res[key];
      }
      return defaultValue;
    }

    //###########################################

    // 数値を min <= num < max の範囲で正規化する

    // @param Number num
    // @param Number min
    // @param Number max
    // @return String

    //###########################################
    static normalize(num, min = 0, max = 1) {
      var range;
      range = Math.abs(max - min);
      if (num < min) {
        num += range * Math.ceil(Math.abs(num - min) / range);
      } else if (max <= num) {
        num -= range * (Math.floor(Math.abs(num - max) / range) + 1);
      }
      return num;
    }

    //###########################################

    // 現在秒を取得

    // @return int

    //###########################################
    static time(date = null) {
      if (date === null) {
        date = new Date();
      }
      return Math.floor(+date / 1000);
    }

    //###########################################

    // 現在ミリ秒を取得

    // @return int/float

    //###########################################
    static militime(date = null, getAsFloat = false) {
      if (date === null) {
        date = new Date();
      }
      return +date / (getAsFloat ? 1000 : 1);
    }

    //###########################################

    // 現在日を YYYY-MM-DD で取得

    // @param Date date
    // @param String dateSep 日付のセパレータ
    // @return String

    //###########################################
    static dateStr(date = null, dateSep = '-') {
      if (date === null) {
        date = new Date();
      }
      return '' + this.zerofill(date.getFullYear(), 4) + dateSep + this.zerofill(date.getMonth() + 1, 2) + dateSep + this.zerofill(date.getDate(), 2);
    }

    //###########################################

    // 現在日時を YYYY-MM-DD HH:ii:ssで取得

    // @param Date date
    // @param String dateSep 日付のセパレータ
    // @param String timeSep 時間のセパレータ
    // @param boolean betweenSep 日付と時間の間の文字
    // @return String

    //###########################################
    static datetimeStr(date = null, dateSep = '-', timeSep = ':', betweenSep = ' ') {
      if (date === null) {
        date = new Date();
      }
      return this.dateStr(date, dateSep) + betweenSep + this.zerofill(date.getHours(), 2) + timeSep + this.zerofill(date.getMinutes(), 2) + timeSep + this.zerofill(date.getSeconds(), 2);
    }

    //###########################################

    // baseDate と targetDate の時刻の差を「何分前」のような表記で取得

    // @param Date targetDate 対象となる日時
    // @param Date baseDate 基準となる日時
    // @param unsigned_int nowSec ついさっき表記する上限の秒数
    // @param String agoStr ついさっき表記の文字列
    // @param String secStr 秒の表記
    // @param String minStr 分の表記
    // @param String hourStr 時間の表記
    // @param String dayStr 日の表記
    // @param String monStr 月の表記
    // @param String yearStr 年の表記
    // @return String

    //###########################################
    static difftime(targetDate, baseDate = null, nowSec = 0, nowStr = 'ついさっき', agoStr = '前', secStr = '秒', minStr = '分', hourStr = '時間', dayStr = '日', monStr = '月', yearStr = '年') {
      var baseTime, d, diffTime, h, m, mo, targetTime, y;
      if (baseDate === null) {
        baseTime = this.time();
      }
      targetTime = this.time(targetDate);
      diffTime = baseTime - targetTime;
      if (diffTime < 0) {
        // 未来
        return null;
      }
      if (nowSec >= diffTime) {
        // ついさっきと表示する基準の秒数
        return nowStr;
      }
      // 一年以上
      y = Math.floor(diffTime / (60 * 60 * 24 * 30 * 12));
      if (y > 0) {
        return '' + y + yearStr + agoStr;
      }
      diffTime -= y * (60 * 60 * 24 * 30 * 12);
      // 一ヶ月以上
      mo = Math.floor(diffTime / (60 * 60 * 24 * 30));
      if (mo > 0) {
        return '' + mo + monStr + agoStr;
      }
      diffTime -= mo * (60 * 60 * 24 * 30);
      // 一日以上
      d = Math.floor(diffTime / (60 * 60 * 24));
      if (d > 0) {
        return '' + d + dayStr + agoStr;
      }
      diffTime -= d * (60 * 60 * 24);
      // 一時間以上
      h = Math.floor(diffTime / (60 * 60));
      if (h > 0) {
        return '' + h + hourStr + agoStr;
      }
      diffTime -= h * (60 * 60);
      // 一分以上
      m = Math.floor(diffTime / 60);
      if (m > 0) {
        return '' + m + minStr + agoStr;
      }
      diffTime -= m * 60;
      if (diffTime > 0) {
        // 一秒以上
        return '' + diffTime + secStr + agoStr;
      }
      // ついさっき
      return nowStr;
    }

    //###########################################

    // 数値をゼロ埋めする

    // @param int num
    // @param int digit 桁数
    // @return int

    //###########################################
    static zerofill(num, digit) {
      return ('' + this.repeat('0', digit) + num).slice(-digit);
    }

    //###########################################

    // str を times 回繰り返した文字列を返す

    // @param String str
    // @param int times
    // @return String

    //###########################################
    static repeat(str, times) {
      return Array(1 + times).join(str);
    }

    //###########################################

    // 配列をシャッフル

    // @param Array ary シャッフルする配列
    // @return Array

    //###########################################
    static shuffle(ary) {
      var i, n;
      n = ary.length;
      while (n) {
        n--;
        i = this.rand(0, n);
        [ary[i], ary[n]] = [ary[n], ary[i]];
      }
      return ary;
    }

    //###########################################

    // 配列 ary に needle が存在するかを調べる

    // @param mixed needle 値
    // @param Array ary
    // @return boolean 存在する場合はtrue, そうでないなら false

    //###########################################
    static inArray(needle, ary) {
      var j, len, v;
      for (j = 0, len = ary.length; j < len; j++) {
        v = ary[j];
        if (v === needle) {
          return true;
        }
      }
      return false;
    }

    //###########################################

    // 配列のコピーを返す

    // @param Array ary
    // @return Array

    //###########################################
    static clone(obj) {
      var res;
      res = obj;
      if ($.isArray(obj)) {
        res = $.extend(true, [], obj);
      } else if (obj instanceof Object) {
        res = $.extend(true, {}, obj);
      }
      return res;
    }

    //###########################################

    // 長さ length の配列を val で満たして返す

    // @param int length
    // @param mixed val
    // @return Array

    //###########################################
    static arrayFill(length, val = null) {
      var i, j, ref, res;
      res = [];
      for (i = j = 0, ref = length; (0 <= ref ? j < ref : j > ref); i = 0 <= ref ? ++j : --j) {
        res[i] = this.clone(val);
      }
      return res;
    }

    //###########################################

    // x * y の配列を val で満たして返す

    // @param int x
    // @param int y 省略時は x と同じ長さ
    // @param mixed val
    // @return Array

    //###########################################
    static array2dFill(x, y = null, val = null) {
      var j, l, ref, ref1, res, xx, yAry, yy;
      if (y === null) {
        y = x;
      }
      res = [];
      yAry = [];
      for (yy = j = 0, ref = y; (0 <= ref ? j < ref : j > ref); yy = 0 <= ref ? ++j : --j) {
        yAry[yy] = this.clone(val);
      }
      for (xx = l = 0, ref1 = x; (0 <= ref1 ? l < ref1 : l > ref1); xx = 0 <= ref1 ? ++l : --l) {
        res[xx] = this.clone(yAry);
      }
      return res;
    }

    //###########################################

    // 配列の合計を返す

    // @param Array ary
    // @return Array

    //###########################################
    static arraySum(ary) {
      var j, len, sum, v;
      sum = 0;
      for (j = 0, len = ary.length; j < len; j++) {
        v = ary[j];
        sum += v;
      }
      return sum;
    }

    //###########################################

    // 配列の最小値を返す

    // @param Array ary
    // @return Array

    //###########################################
    static arrayMin(ary) {
      var j, len, min, v;
      min = null;
      for (j = 0, len = ary.length; j < len; j++) {
        v = ary[j];
        if (min === null || min > v) {
          min = v;
        }
      }
      return min;
    }

    //###########################################

    // 配列の最大値を返す

    // @param Array ary
    // @return Array

    //###########################################
    static arrayMax(ary) {
      var j, len, max, v;
      max = null;
      for (j = 0, len = ary.length; j < len; j++) {
        v = ary[j];
        if (max === null || max < v) {
          max = v;
        }
      }
      return max;
    }

    //###########################################

    // 連想配列のキーの数を返す

    // @param Object object
    // @return int

    //###########################################
    static count(object) {
      return Object.keys(object).length;
    }

    //###########################################

    // uuid を生成（バージョン4）

    // @return String

    //###########################################
    static uuid4() {
      var i, j, random, uuid;
      uuid = '';
      for (i = j = 0; j < 32; i = ++j) {
        random = Math.random() * 16 | 0;
        if (i === 8 || i === 12 || i === 16 || i === 20) {
          uuid += '-';
        }
        uuid += (i === 12 ? 4 : (i === 16 ? random & 3 | 8 : random)).toString(16);
      }
      return uuid;
    }

    //###########################################

    // ローカルストレージの値を削除

    // @param String key
    // @param mixed value
    // @return undefined

    //###########################################
    static delLs(key) {
      return localStorage.removeItem(key);
    }

    //###########################################

    // ローカルストレージに値を設定

    // @param String key
    // @param mixed value
    // @return undefined

    //###########################################
    static setLs(key, value = null) {
      var json;
      if (value === null) {
        // null は削除
        return this.delLs(key);
      }
      json = JSON.stringify(value);
      return localStorage.setItem(key, json);
    }

    //###########################################

    // ローカルストレージから値を取得

    // @param String key
    // @return undefined

    //###########################################
    static getLs(key) {
      var res;
      res = localStorage.getItem(key);
      try {
        res = JSON.parse(res);
      } catch (error) {
        res = null;
      }
      return res;
    }

    //###########################################

    // ミリ秒待つ（要async/await対応ブラウザ＆coffee2.x）

    // @param String key
    // @return undefined

    //###########################################
    static sleep(msec) {
      return new Promise((resolve, reject) => {
        return setTimeout(() => {
          return resolve();
        }, msec);
      });
    }

  };

  //###########################################

  // key-valueとしてIndexedDBを簡単に使うクラス

  //###########################################
  Utl.IndexedDB = (function() {
    class IndexedDB {
      constructor(dbName = 'default', dbVersion = 1) {
        var open;
        this.dbName = dbName;
        this.dbVersion = dbVersion;
        this.db = null;
        open = window.indexedDB.open(this.dbName, this.dbVersion);
        open.onupgradeneeded = (evt) => {
          var res;
          res = evt.target.result;
          return res.createObjectStore(this.STORE_NAME, {
            keyPath: 'kvstore_key'
          });
        };
        open.onsuccess = (evt) => {
          return this.db = evt.target.result;
        };
      }

      // awaitで使う
      async set(key, value) {
        var db, request, store, token, transaction;
        await this.waitUnLock();
        token = this.genToken();
        this.lock(token);
        db = (await this.getDB());
        transaction = db.transaction(this.STORE_NAME, 'readwrite');
        store = transaction.objectStore(this.STORE_NAME);
        request = store.put({
          kvstore_key: key,
          kvstore_value: JSON.stringify(value)
        });
        request.onsuccess = (evt) => {
          if (token === this.token) {
            return this.capture(true, token);
          } else {
            return this.capture(false, token);
          }
        };
        request.onerror = (evt) => {
          return this.capture(false, token);
        };
        await this.waitCapture();
        if (token === this.token && this.isCaptured) {
          return this.unlock(token);
        } else {
          return false;
        }
      }

      // awaitで使う
      async get(key) {
        var db, request, store, token, transaction;
        await this.waitUnLock();
        token = this.genToken();
        this.lock(token);
        db = (await this.getDB());
        transaction = db.transaction(this.STORE_NAME, 'readonly');
        store = transaction.objectStore(this.STORE_NAME);
        request = store.get(key);
        request.onsuccess = (evt) => {
          var res;
          try {
            res = JSON.parse(evt.target.result.kvstore_value);
          } catch (error) {
            res = null;
          }
          if (token === this.token) {
            return this.capture(res, token);
          } else {
            return this.unlock(token);
          }
        };
        await this.waitCapture();
        if (this.isCaptured) {
          return this.unlock(token);
        } else {
          return null;
        }
      }

      // awaitで使う
      async gets(keys) {
        var db, j, key, len, request, res, store, token, transaction;
        await this.waitUnLock();
        token = this.genToken();
        this.lock(token);
        res = {};
        db = (await this.getDB());
        transaction = db.transaction(this.STORE_NAME, 'readonly');
        store = transaction.objectStore(this.STORE_NAME);
        for (j = 0, len = keys.length; j < len; j++) {
          key = keys[j];
          request = store.get(key);
          request.onsuccess = (evt) => {
            try {
              return res[evt.target.result.kvstore_key] = JSON.parse(evt.target.result.kvstore_value);
            } catch (error) {
              return res[evt.target.result.kvstore_key] = null;
            }
          };
        }
        transaction.oncomplete = (evt) => {
          return this.capture(res, token);
        };
        await this.waitCapture();
        if (this.isCaptured) {
          return this.unlock(token);
        } else {
          return null;
        }
      }

      // awaitで呼ぶ
      async getAllKeys() {
        var db, keys, request, store, token, transaction;
        await this.waitUnLock();
        token = this.genToken();
        this.lock(token);
        keys = [];
        db = (await this.getDB());
        transaction = db.transaction(this.STORE_NAME, 'readonly');
        store = transaction.objectStore(this.STORE_NAME);
        request = store.openCursor();
        request.onsuccess = (evt) => {
          var cursor;
          cursor = evt.target.result;
          if (cursor) {
            keys.push(cursor.key);
            return cursor.continue();
          } else {
            return this.capture(keys, token);
          }
        };
        request.onerror = (evt) => {
          return this.unlock(token);
        };
        await this.waitCapture();
        if (this.isCaptured) {
          return this.unlock(token);
        } else {
          return [];
        }
      }

      destroy() {
        return window.indexedDB.deleteDatabase(this.dbName);
      }

      unlock(token = null) {
        var res;
        if (token === null || token === this.token) {
          res = this.result;
          this.result = null;
          this.isCaptured = false;
          this.locked = null;
          this.token = null;
          this.isLocked = false;
          return res;
        } else {
          return null;
        }
      }

      capture(value, token) {
        if (this.token === token) {
          this.isLocked = true;
          this.isCaptured = true;
          return this.result = value;
        }
      }

      lock(token) {
        this.isLocked = true;
        this.token = token;
        this.isCaptured = false;
        this.locked = +(new Date());
        this.result = null;
        return true;
      }

      async waitUnLock() {
        while (this.isLocked && +(new Date()) - this.locked < this.TIMEOUT_MSEC) {
          await Utl.sleep(this.LOCK_WAIT_MSEC);
        }
        return true;
      }

      async waitCapture() {
        while (!this.isCaptured && +(new Date()) - this.locked < this.TIMEOUT_MSEC) {
          await Utl.sleep(this.LOCK_WAIT_MSEC);
        }
        return true;
      }

      async waitInitialized() {
        while (this.isInitialized && +(new Date()) - this.locked < this.TIMEOUT_MSEC) {
          await Utl.sleep(this.LOCK_WAIT_MSEC);
        }
        return true;
      }

      genToken() {
        return '' + (+new Date()) + Utl.genPassword(128);
      }

      async getDB() {
        while (this.db === null) {
          await Utl.sleep(this.LOCK_WAIT_MSEC);
        }
        return this.db;
      }

    };

    // テーブル名
    IndexedDB.prototype.STORE_NAME = 'default';

    // ロック待ちミリ秒（1回あたり）
    IndexedDB.prototype.LOCK_WAIT_MSEC = 50;

    // タイムアウトにするミリ秒
    IndexedDB.prototype.TIMEOUT_MSEC = 5000;

    return IndexedDB;

  }).call(this);

  return Utl;

}).call(this);
