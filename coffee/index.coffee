window.db = null
window.isGettingList = false
window.gType = null

window.getKifuData = {}
window.url = null

# 終局表現
window.ENDING = 
  TIME_UP: [
    'SENTE_WIN_DISCONNECT'
    'SENTE_WIN_TIMEOUT'
    'GOTE_WIN_DISCONNECT'
    'GOTE_WIN_TIMEOUT'
  ]
  SENTE_ILLEGAL_MOVE:[
    'GOTE_WIN_OUTE_SENNICHI'
  ]
  GOTE_ILLEGAL_MOVE:[
    'SENTE_WIN_OUTE_SENNICHI'
  ]
  SENNICHITE:[
    'DRAW_SENNICHI'
  ]
  TORYO:[
    'SENTE_WIN_TORYO'
    'GOTE_WIN_TORYO'
  ]
  TSUMI:[
    'SENTE_WIN_CHECKMATE'
    'GOTE_WIN_CHECKMATE'
  ]
  KACHI:[
    'SENTE_WIN_ENTERINGKING'
    'GOTE_WIN_ENTERINGKING'
  ]

$().ready ->
  # DB
  window.db = new Utl.IndexedDB()
  $(':checkbox').radiocheck()

  user = Utl.getLs('USERNAME')
  if user is null
    $('#modal_change_user').modal()
  else
    $('#user_name_input').val(user)
    window.getIndexes(user)

  $('#start').on 'click', ->
    window.setUser $('#user_name_input').val()

  $('#open_user').on 'click', ->
    $('#modal_change_user').modal() unless window.isGettingList

  # チェック状態の保存
  onCheckboxChange = ->
    Utl.setLs 'CHECKED_'+$(@).attr('id'), $(@).prop('checked')
    await window.draw()
  $('#10m, #sb, #s1').on 'change', onCheckboxChange
  # 復元
  for id in ['10m', 'sb', 's1']
    checked = Utl.getLs 'CHECKED_'+id
    if checked isnt null
      $('#'+id).prop('checked', checked)
    onCheckboxChange($('#'+id))
  

  # メッセージ内の×ボタンクリックでメッセージを非表示にする
  $('.alert .close').on 'click', ->
    $(@).parents('.alert').hide()

window.setUser = (user)->
  Utl.setLs 'USERNAME', user
  window.getIndexes(user)

window.getKifu = (url)->
  console.log(url)
  $.getJSON('http://localhost:7777/'+url).done((r)-> window.getKifuCallbackSuccess(r)).fail(-> window.getKifuCallbackFail(url))

window.getKifuCallbackFail = (url)->
  window.getKifu(url)

window.getKifuCallbackSuccess = (response)->
  url = response['url']
  res = response['response']
  kifuName = window.url2kifuName(url)
  sw = res.match(/receiveMove\("([^"]+)"\);/)[1].split("\t")
  # DBに保存
  dbrec = await window.db.get kifuName
  csa = window.sw2csa(sw, dbrec)
  dbrec.csa = csa
  await window.db.set kifuName, dbrec

window.sw2csa = (sw, dbrec)->
  game_type = switch dbrec.game_type
    when 's1' then '10秒'
    when 'sb' then '3分'
    else '10分'
  buf = ''
  # バージョン
  buf += 'V2.2'+"\n"
  # 対局者名
  buf += 'N+'+dbrec.sente.name+'('+dbrec.sente.rank+")\n"
  buf += 'N-'+dbrec.gote.name+'('+dbrec.gote.rank+")\n"
  # 対局場所
  buf += '$SITE:将棋ウォーズ('+game_type+')'+"\n"
  # 持ち時間
  buf += '$TIME_LIMIT:'
  buf += switch game_type
    when '10秒' then '00:00+10'
    when '3分' then '00:03+00'
    else '00:10+00'
  buf += "\n"
  # 平手の局面
  buf += 'PI'+"\n"
  # 先手番
  buf += "+\n"
  # 指し手と消費時間
  restTime = switch game_type
    when '10秒' then 60*60
    when '3分' then 60*3
    else 60*10
  restTimes = 
    sente: restTime
    gote: restTime
  for s in sw
    if      window.ENDING.TIME_UP.indexOf(s) >= 0
      buf += "%TIME_UP\n"
    else if window.ENDING.SENTE_ILLEGAL_MOVE.indexOf(s) >= 0
      buf += "%-ILLEGAL_ACTION\n"
    else if window.ENDING.GOTE_ILLEGAL_MOVE.indexOf(s) >= 0
      buf += "%+ILLEGAL_ACTION\n"
    else if window.ENDING.SENNICHITE.indexOf(s) >= 0
      buf += "%+ILLEGAL_ACTION\n"
    else if window.ENDING.TORYO.indexOf(s) >= 0
      buf += "%TORYO\n"
    else if window.ENDING.KACHI.indexOf(s) >= 0
      buf += "%KACHI\n"
    else if window.ENDING.TSUMI.indexOf(s) >= 0
      buf += "%TSUMI\n"
    else
      #console.log(s)
      [te, rest] = s.split(',')
      isFirst = te.substr(0, 1) is '+'
      rest = Number(rest.substr(1))
      buf += te+"\n"

      name = if isFirst then 'sente' else 'gote'
      buf += 'T'+(restTimes[name] - rest)+"\n"
      restTimes[name] = rest
  buf

window.finish = ->
  console.log 'finished.'
  window.draw()
  window.isGettingList = false
  

window.draw = ->
  results = await window.getMine()
  results.sort (a, b)->
    b.date - a.date

  $('#user_name').html(window.myName)

  tbody = $('#result').find('table').find('tbody')
  tbody.html('')
  for res in results
    if res.sente.name is window.myName
      is_win = if res.win is 0 then 1 else 0
      is_first = true
      my_rank = res.sente.rank
      my_name = res.sente.name
      op_rank = res.gote.rank
      op_name = res.gote.name
    else
      is_win = if res.win is 1 then 1 else 0
      is_first = false
      my_rank = res.gote.rank
      my_name = res.gote.name
      op_rank = res.sente.rank
      op_name = res.sente.name
    if res.win is 2
      is_win = 2

    is_friend = res.is_friend
    url = res.url
    game_type = switch res.game_type
      when 'sb' then '3分'
      when 's1' then '10秒'
      else '10分'
    game_type_class = switch res.game_type
      when 'sb' then 'm3'
      when 's1' then 'm10'
      else 's10'
    dt = window.dateFormat(res.date)

    tr = $('<tr>').append(
      $('<td>').addClass(if is_win is 1 then 'win' else if is_win is 0 then 'lose' else 'draw').html(my_name)
    ).append(
      $('<td>').addClass('center').html(my_rank)
    ).append(
      $('<td>').attr('rowspan', 2).addClass(if is_first then 'sente' else 'gote').html(if is_first then '先' else '')
    ).append(
      $('<td>').attr('rowspan', 2).addClass(if is_first then 'gote' else 'sente').html(if is_first then '' else '先')
    ).append(
      $('<td>').addClass('center').html(op_rank+(if is_friend then '<br><span class="label label-danger">友達</span>' else ''))
    ).append(
      $('<td>').addClass(if is_win is 1 then 'lose' else if is_win is 0 then 'win' else 'draw').html(op_name)
    ).append(
      $('<td>').attr('rowspan', 2).addClass(game_type_class).html(game_type)
    ).append(
      $('<td>').attr('rowspan', 2).addClass('center').html(dt)
    ).append(
      $('<td>').attr('rowspan', 2).addClass('center').append(
        $('<button>')
        .addClass('btn btn-sm btn-primary')
        .attr('dt-key', res.kifu_name)
        .html('コピー')
        .on('click', ->
          rec = await window.db.get($(@).attr('dt-key'))
          window.execCopy(rec.csa)
        )
      ).append(
        $('<a>')
        .addClass('btn btn-sm btn-info')
        .attr('href', res.url)
        .attr('target', 'wars')
        .html('棋譜')
      )
    )
    tbody.append tr

    tags = window.getTags(res.csa)
    tr2 = $('<tr>')
    for index in (if is_first then [0, 1] else [1, 0])
      td = $('<td>').attr('colspan', 2)
      for t in tags[index]
        td.append $('<span>').addClass('label label-default').html(t)
      tr2.append td
    tbody.append tr2

window.getIndexes = (userName)->
  return if window.isGettingList
  window.isGettingList = true
  window.myName = userName
  window.gTypes = ['', 'sb', 's1']
  window.getIndex()

window.getIndex = ->
  return window.finish() if window.gTypes.length <= 0
  window.gType = window.gTypes.pop()
  url = 'https://shogiwars.heroz.jp/users/history/'+window.myName+'/web_app?locale=ja'
  url += '&gtype='+gType if gType isnt ''

  window.getIndexCall('http://localhost:7777/'+url)

window.getIndexCall = (url = null)->
  window.url = url unless url is null
  console.log(window.url)
  $.getJSON(window.url).done((r)-> window.getIndexCallbackSuccess(r)).fail(-> window.getIndexCallbackFail())

window.getIndexCallbackFail = ->
  window.getIndexCall()

window.getIndexCallbackSuccess = (response)->
  # 既に取得した棋譜があるか
  isExistAlreadyGot = false

  parser = new DOMParser();
  doc = parser.parseFromString(response['response'], "text/html");

  # 対戦結果の取得
  for content in doc.getElementsByClassName('contents')
    result = {}
    
    # 千日手パターン
    result.win = 2
    # 対戦者の情報
    isFirst = true
    for player in content.getElementsByClassName('history_prof')
      [name, rank] = player.getElementsByTagName('table')[0].getElementsByTagName('td')[1].innerText.split(" ")
      isWin = player.classList.contains('win')

      if isFirst
        result.sente = 
          name: name
          rank: rank
      else
        result.gote = 
          name: name
          rank: rank

      if isWin
        result.win = if isFirst then 0 else 1

      isFirst = false

    # 時刻
    result.date = if result.win is 2
        new Date(content.getElementsByTagName('div')[3].innerText)
      else
        new Date(content.getElementsByTagName('div')[4].innerText)
    # 棋譜のURL
    result.url = 'https:'+content.getElementsByClassName('short_btn1')[0].getElementsByTagName('a')[0].getAttribute('href')
    # 友達対戦であるか
    isFriend = false
    for div in content.getElementsByTagName('div')
      if div.innerText is '友達'
        isFriend = true
        break
    result.is_friend = isFriend
    # 持ち時間タイプ
    result.game_type = window.gType

    # IndexedDBにあるか見る
    key = window.url2kifuName(result.url)
    stored = await window.db.get key
    if stored is null
      await window.db.set key, result
      # 棋譜も取ってしまう
      window.getKifu result.url
    else
      # 取得済みの棋譜がある
      isExistAlreadyGot = true


  # 次のページがあればそれも取得
  isNext = false
  for a in doc.getElementsByTagName('a')
    if not($('#only1page').prop('checked')) and (a.innerText is '次へ>>' or a.innerText is '次へ&gt;&gt;')
      # 取得済みの棋譜がないなら次のページも見る
      unless isExistAlreadyGot
        url = 'https://shogiwars.heroz.jp'+$(a).attr('href')
        window.getIndexCall('http://localhost:7777/'+url)
        isNext = true
        break
  # 次のページがなければ次のゲームモード
  window.getIndex() unless isNext

window.dateFormat = (dt)->
  dt = new Date(dt) if typeof(dt) is 'string'
  y = dt.getFullYear()
  m = dt.getMonth() + 1
  d = dt.getDate()
  w = dt.getDay()
  h = dt.getHours()
  i = dt.getMinutes()
  s = dt.getSeconds()
  wNames = ['日', '月', '火', '水', '木', '金', '土']

  ###
  m = ('0' + m).slice(-2)
  d = ('0' + d).slice(-2)
  ###
  h = ('0' + h).slice(-2)
  i = ('0' + i).slice(-2)
  s = ('0' + s).slice(-2)

  m + '/' + d + ' ' + h + ':' + i

window.execCopy = (string) ->
  temp = document.createElement('div')
  temp.appendChild(document.createElement('pre')).textContent = string
  s = temp.style
  s.position = 'fixed'
  s.left = '-100%'
  document.body.appendChild temp
  document.getSelection().selectAllChildren temp
  result = document.execCommand('copy')
  document.body.removeChild temp
  $('.alert').fadeIn(500).delay(1000).fadeOut(1000)

window.url2kifuName = (url)->
  spl = url.split('/')
  spl[spl.length-1].replace(/\?.*$/g, '')

window.getMine = ->
  results = []
  keys = await window.db.getAllKeys()
  count = 0
  ###
  for key in keys
    res = await window.db.get key
    console.log(''+count+'件ロード') if ++count % 10 is 0
    res.date = new Date(res.date)
    res.kifu_name = key
    results.push res if [res.sente.name, res.gote.name].indexOf(window.myName) >= 0
  results
  ###
  res = await window.db.gets keys
  is10m = $('#10m').prop('checked')
  is3m = $('#sb').prop('checked')
  is10s = $('#s1').prop('checked')
  for k, v of res
    v.date = new Date(v.date)
    v.kifu_name = k
    if [v.sente.name, v.gote.name].indexOf(window.myName) >= 0
      if (is10m and v.game_type is '') or (is3m and v.game_type is 'sb') or (is10s and v.game_type is 's1')
        results.push v
  results

window.getTags = (csa)->
  b = new Board(csa)
  b.getTags()