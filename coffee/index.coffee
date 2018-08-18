window.results = []
window.isGettingList = false
window.gType = null

window.getKifuData = {}
window.clipboard = null

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
  $(':checkbox').radiocheck()

  user = Utl.getLs('USERNAME')
  if user is null
    $('#modal_change_user').modal()
  else
    window.getIndexes(user)

  $('#start').on 'click', ->
    window.setUser $('#user_name_input').val()

  $('#open_user').on 'click', ->
    $('#modal_change_user').modal() unless window.isGettingList

  $('#copy').on 'click', ->
    window.execCopy($('#clipboard').html())

window.setUser = (user)->
  Utl.setLs 'USERNAME', user
  window.getIndexes(user)

window.getKifu = ->
  url = 'https:'+$(@).attr('dt-url')
  window.getKifuData = 
    sente: $(@).attr('dt-sente')
    gote: $(@).attr('dt-gote')
    game_type: $(@).attr('dt-gametype')
  $.getJSON('http://localhost:7777/'+url).done(window.getKifuCallback)

window.getKifuCallback = (response)->
  response = response['response']
  res = response.match(/receiveMove\("([^"]+)"\);/)[1].split("\t")
  csa = window.sw2csa(res)
  
  $('#clipboard').html(csa)
  $('#modal_clipboard').modal()

window.sw2csa = (sw)->
  buf = ''
  # バージョン
  buf += 'V2.2'+"\n"
  # 対局者名
  buf += 'N+'+window.getKifuData.sente+"\n"
  buf += 'N-'+window.getKifuData.gote+"\n"
  # 対局場所
  buf += '$SITE:将棋ウォーズ('+window.getKifuData.game_type+')'+"\n"
  # 持ち時間
  buf += '$TIME_LIMIT:'
  buf += switch window.getKifuData.game_type
    when 's1' then '00:00+10'
    when 'sb' then '00:03+00'
    else '00:10+00'
  buf += "\n"
  # 平手の局面
  buf += 'PI'+"\n"
  # 先手番
  buf += "+\n"
  # 指し手と消費時間
  restTime = switch window.getKifuData.game_type
    when 'sb' then 60*3
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
      console.log(s)
      [te, rest] = s.split(',')
      isFirst = te.substr(0, 1) is '+'
      rest = Number(rest.substr(1))
      buf += te+"\n"
      switch window.getKifuData.game_type
        when 's1'
          buf += 'T'+(10 - rest)+"\n"
        else
          name = if isFirst then 'sente' else 'gote'
          buf += 'T'+(restTimes[name] - rest)+"\n"
          restTimes[name] = rest
  buf

window.finish = ->
  console.log 'finished.'
  window.draw()
  window.isGettingList = false
  

window.draw = ->
  window.results.sort (a, b)->
    b.date - a.date

  $('#user_name').html(window.myName)

  tbody = $('#result').find('table').find('tbody')
  tbody.html('')
  for res in window.results
    is_win = res.is_win
    is_first = res.is_first
    is_friend = res.is_friend
    url = res.url
    my_rank = res.my_rank
    my_name = res.my_name
    op_rank = res.opponent_rank
    op_name = res.opponent_name
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
      $('<td>').addClass(if is_win then 'win' else 'lose').html(my_name)
    ).append(
      $('<td>').addClass('center').html(my_rank)
    ).append(
      $('<td>').addClass(if is_first then 'sente' else 'gote').html(if is_first then '先' else '')
    ).append(
      $('<td>').addClass(if is_first then 'gote' else 'sente').html(if is_first then '' else '先')
    ).append(
      $('<td>').addClass('center').html(op_rank)
    ).append(
      $('<td>').addClass(if is_win then 'lose' else 'win').html(op_name)
    ).append(
      $('<td>').addClass(game_type_class).html(game_type)
    ).append(
      $('<td>').addClass('center').html(dt)
    ).append(
      $('<td>').addClass('center').append(
        $('<button>')
        .addClass('btn btn-sm btn-primary')
        .attr('dt-url', url)
        .attr('dt-sente', if is_first then my_name else op_name)
        .attr('dt-gote', if is_first then op_name else my_name)
        .attr('dt-gametype', game_type)
        .html('コピー')
        .on('click', window.getKifu)
      )
    )

    tbody.append tr

window.getIndexes = (userName)->
  return if window.isGettingList
  window.isGettingList = true
  window.results = []
  window.myName = userName
  window.gTypes = []
  window.gTypes.push '' if $('#10m').prop('checked')
  window.gTypes.push 'sb' if $('#sb').prop('checked')
  window.gTypes.push 's1' if $('#s1').prop('checked')
  window.getIndex()

window.getIndex = ->
  return window.finish() if window.gTypes.length <= 0
  window.gType = window.gTypes.pop()
  url = 'https://shogiwars.heroz.jp/users/history/'+window.myName+'/web_app?locale=ja'
  url += '&gtype='+gType if gType isnt ''

  console.log('http://localhost:7777/'+url)
  $.getJSON('http://localhost:7777/'+url).done(window.getIndexCallback)

window.getIndexCallback = (response)->
  parser = new DOMParser();
  doc = parser.parseFromString(response['response'], "text/html");

  # 対戦結果の取得
  for content in doc.getElementsByClassName('contents')
    result = {}
    
    # 対戦者の情報
    isFirst = true
    for player in content.getElementsByClassName('history_prof')
      [name, rank] = player.getElementsByTagName('table')[0].getElementsByTagName('td')[1].innerText.split(" ")
      isWin = player.classList.contains('win')
      isMe  = (window.myName is name)

      if isMe
        result.my_name = name
        result.my_rank = rank
        result.is_win = isWin
        result.is_first = isFirst
      else
        result.opponent_name = name
        result.opponent_rank = rank
        result.is_win = not isWin

      isFirst = false
    # 時刻
    result.date = new Date(content.getElementsByTagName('div')[4].innerText)
    # 棋譜のURL
    result.url = content.getElementsByClassName('short_btn1')[0].getElementsByTagName('a')[0].getAttribute('href')
    # 友達対戦であるか
    isFriend = false
    for div in content.getElementsByTagName('div')
      if div.innerText is '友達'
        isFriend = true
        break
    # 持ち時間タイプ
    result.game_type = window.gType

    # 結果に追加
    window.results.push result

  # 次のページがあればそれも取得
  isNext = false
  for a in doc.getElementsByTagName('a')
    if a.innerText is '次へ>>'
      window.getIndex()
      isNext = true
      break
  # 次のページがなければ次のゲームモード
  window.getIndex() unless isNext

window.dateFormat = (dt)->
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

