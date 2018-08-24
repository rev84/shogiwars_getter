class Board
  constructor:(@csa)->
  
  getTags:->
    return [[], []] unless @csa
    @initBoard()
    for line in @csa.split("\n")
      res = @move line
      continue unless res
      @parse()
    @tags

  parse:->
    dump = @boardDump()
    for name, tebans of window.SCENES
      for teban in [0..1]
        for reg in tebans[teban]
          @tags[teban].push name if dump.match(new RegExp('^'+reg+'$', 'g')) and not(Utl.inArray(name, @tags[teban]))

  initBoard:->
    @tags = [[], []]
    @board = Utl.array2dFill(9, 9, '.')
    # 歩
    @board[x][6] = @koma2Reg(true, 'FU') for x in [0...9]
    @board[x][2] = @koma2Reg(false, 'FU') for x in [0...9]
    # 香
    @board[0][8] = @board[8][8] = @koma2Reg(true, 'KY')
    @board[0][0] = @board[8][0] = @koma2Reg(false, 'KY')
    # 桂
    @board[1][8] = @board[7][8] = @koma2Reg(true, 'KE')
    @board[1][0] = @board[7][0] = @koma2Reg(false, 'KE')
    # 銀
    @board[2][8] = @board[6][8] = @koma2Reg(true, 'GI')
    @board[2][0] = @board[6][0] = @koma2Reg(false, 'GI')
    # 金
    @board[3][8] = @board[5][8] = @koma2Reg(true, 'KI')
    @board[3][0] = @board[5][0] = @koma2Reg(false, 'KI')
    # 王
    @board[4][8] = @koma2Reg(true, 'OU')
    @board[4][0] = @koma2Reg(false, 'OU')
    # 角
    @board[7][7] = @koma2Reg(true, 'KA')
    @board[1][1] = @koma2Reg(false, 'KA')
    # 飛
    @board[1][7] = @koma2Reg(true, 'HI')
    @board[7][1] = @koma2Reg(false, 'HI')

  move:(te)->
    # 指し手のフォーマットじゃない
    return false unless te.match(/^[\+\-]\d{4}[A-Z]{2}$/)

    isSente = te.substr(0, 1) is '+'
    [komaFromX, komaFromY] = te.substr(1, 2).split('')
    komaFromX = Number(komaFromX)
    komaFromY = Number(komaFromY)
    [komaToX, komaToY] = te.substr(3, 2).split('')
    komaToX = Number(komaToX)
    komaToY = Number(komaToY)
    koma = te.substr(5, 2)

    # 移動先を上書き
    @board[komaToX-1][komaToY-1] = @koma2Reg(isSente, koma)
    # 持ち駒から打ってない場合は元を消す
    if komaFromX isnt 0
      @board[komaFromX-1][komaFromY-1] = '.'
    true

  boardDump:->
    res = ''
    for x in [0...9]
      res += @board[x].join('')
    res

  koma2Reg:(isSente, koma)->
    defines = @defineKoma2reg()
    if isSente
      defines[0][koma]
    else
      defines[1][koma]

  defineKoma2reg:->
    res = [
      {
        FU: 'a'
        KY: 'b'
        KE: 'c'
        GI: 'd'
        KI: 'e'
        KA: 'f'
        HI: 'g'
        TO: 'h'
        NY: 'i'
        NK: 'j'
        NG: 'k'
        UM: 'l'
        RY: 'm'
        OU: 'n'
      }
      {
        FU: 'o'
        KY: 'p'
        KE: 'q'
        GI: 'r'
        KI: 's'
        KA: 't'
        HI: 'u'
        TO: 'v'
        NY: 'w'
        NK: 'x'
        NG: 'y'
        UM: 'z'
        RY: '0'
        OU: '1'
      }
    ]
