<?php

mb_regex_encoding("UTF-8");

$files = glob(dirname(__FILE__).'/scene/*.bod');
$files = preg_replace('`^.+/`', '', $files);

$res = [];
foreach ($files as $file) {
    if ($file == 'base.bod') continue;
    $num = preg_replace('`\.bod$`', '', $file);
    $num = preg_replace('`_.*$`', '', $num);
    $name = file2name($num);
    $fileBuf = file_get_contents(dirname(__FILE__).'/scene/'.$file);
    list($sente, $gote) = bod2reg($fileBuf);
    if (!isset($res[$name])) $res[$name] = [];
    $res[$name] = array_merge($res[$name], [$sente, $gote]);
}

file_put_contents(dirname(__FILE__).'/result.json', json_encode($res, JSON_UNESCAPED_UNICODE));

function bod2reg($bodStr)
{
    $boardSente = array_fill(0, 9, array_fill(0, 9, '.'));
    $boardGote = array_fill(0, 9, array_fill(0, 9, '.'));
    $bodArray = explode("\n", str_replace(["\r\n", "\r", "\n"], "\n", $bodStr));
    $y = 0;
    foreach ($bodArray as $line) {
        $match = preg_match('`^\|(.*)\|[一二三四五六七八九]$`u', $line, $matches);
        if ($match) {
            $komas = $matches[1];
            for ($index = 0; $index < 9; $index++) {
                $mark = mb_substr($komas, $index*2, 2);
                $boardSente[8-$index][$y] = convertKoma($mark);
                $boardGote[$index][8-$y] = turnKoma(convertKoma($mark));
            }
            $y++;
        }
    }

    $sente = '';
    $gote = '';
    for ($x = 0; $x < count($boardSente); $x++) {
        $sente .= join('', $boardSente[$x]);
        $gote .= join('', $boardGote[$x]);
    }

    return [$sente, $gote];
}

function file2name($file)
{
    $def = [
        '001' => 'カニ囲い',
        '002' => '金矢倉',
        '003' => '銀矢倉',
        '004' => '片矢倉',
        '005' => '総矢倉',
        '006' => '矢倉穴熊',
        '007' => '菊水矢倉',
        '008' => '銀立ち矢倉',
        '009' => '菱矢倉',
        '010' => '雁木',
        '011' => 'ボナンザ囲い',
        '012' => '美濃',
        '013' => '高美濃',
        '014' => '銀冠',
        '015' => '銀美濃',
        '016' => 'ダイヤモンド美濃',
        '017' => '木村美濃',
        '018' => '片美濃',
        '019' => 'ちょんまげ美濃',
        '020' => '左美濃',
        '021' => '天守閣美濃',
        '022' => '四枚美濃',
        '023' => '舟囲い',
        '024' => '居飛車穴熊',
        '025' => '松尾流穴熊',
        '026' => '銀冠穴熊',
        '027' => 'ビッグ4',
        '028' => '箱入り娘',
        '029' => 'ミレニアム',
        '030' => '振り飛車穴熊',
        '031' => '右矢倉',
        '032' => '金無双',
        '033' => '中住まい',
        '034' => '中原玉',
        '035' => 'アヒル囲い',
        '036' => 'いちご囲い',
        '037' => '無敵囲い',
        '038' => '3七銀戦法',
        '039' => '脇システム',
        '040' => '森下システム',
        '041' => '雀刺し',
        '042' => '米長流急戦矢倉',
    ];

    return $def[$file];
}

function convertKoma($koma)
{
    $def = [
        ' ・' => '.',
        ' 歩' => 'a',
        ' 香' => 'b',
        ' 桂' => 'c',
        ' 銀' => 'd',
        ' 金' => 'e',
        ' 角' => 'f',
        ' 飛' => 'g',
        ' 玉' => 'h',
        'v歩' => '1',
        'v香' => '2',
        'v桂' => '3',
        'v銀' => '4',
        'v金' => '5',
        'v角' => '6',
        'v飛' => '7',
        'v玉' => '8',
    ];

    return $def[$koma];
}

function turnKoma($koma)
{
    $def = [
        '.' => '.',
        '1' => 'a',
        '2' => 'b',
        '3' => 'c',
        '4' => 'd',
        '5' => 'e',
        '6' => 'f',
        '7' => 'g',
        '8' => 'h',
        'a' => '1',
        'b' => '2',
        'c' => '3',
        'd' => '4',
        'e' => '5',
        'f' => '6',
        'g' => '7',
        'h' => '8',
    ];

    return $def[$koma];
}