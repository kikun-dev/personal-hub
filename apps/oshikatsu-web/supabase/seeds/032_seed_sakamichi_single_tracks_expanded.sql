-- ============================================================
-- Orbit starter seed: expanded Sakamichi single track lists
-- ============================================================
-- Scope:
-- - CD single song tracks for 乃木坂46 / 欅坂46 / 櫻坂46 / 日向坂46.
-- - Off vocal / instrumental tracks are intentionally excluded.
-- - This is a "fill missing tracks" seed. Existing release-track links are not deleted.
--
-- Run after:
-- - 030_seed_sakamichi_release_tracks_starter.sql
-- - 031_seed_sakamichi_tracks_expanded.sql (optional)
--
-- Behavior:
-- - If a release exists, tracks in track_titles are inserted when missing.
-- - If a track is not yet linked to the release, it is appended after the current max track_number.
-- - This avoids conflicts with earlier starter seeds, while still bringing most singles
--   up to the usual 6-7 song tracks per release.
--
-- Main source patterns checked:
-- - Official discography / special sites where available.
-- - Wikipedia single pages and discography pages for B-side listings.
-- - Recent releases checked explicitly: ネーブルオレンジ, Same numbers, ビリヤニ,
--   最後に階段を駆け上がったのはいつだ?, Make or Break, UDAGAWA GENERATION,
--   I want tomorrow to come, Unhappy birthday構文, Love yourself!, クリフハンガー.
-- ============================================================

DO $seed$
BEGIN
SET CONSTRAINTS ALL DEFERRED;

DROP TABLE IF EXISTS orbit_seed_resolved_single_tracks;
DROP TABLE IF EXISTS orbit_seed_single_tracks;
DROP TABLE IF EXISTS orbit_seed_single_track_groups;

CREATE TEMP TABLE orbit_seed_single_track_groups (
  release_group_name TEXT NOT NULL,
  release_title TEXT NOT NULL,
  release_type TEXT NOT NULL,
  release_numbering INT,
  track_group_name TEXT NOT NULL,
  track_titles TEXT[] NOT NULL
) ON COMMIT PRESERVE ROWS;

INSERT INTO orbit_seed_single_track_groups (
  release_group_name,
  release_title,
  release_type,
  release_numbering,
  track_group_name,
  track_titles
)
VALUES
  -- 乃木坂46
  ('乃木坂46', 'ぐるぐるカーテン', 'single', 1, '乃木坂46', ARRAY['ぐるぐるカーテン', '左胸の勇気', '乃木坂の詩', '会いたかったかもしれない', '失いたくないから', '白い雲にのって']),
  ('乃木坂46', 'おいでシャンプー', 'single', 2, '乃木坂46', ARRAY['おいでシャンプー', '心の薬', '偶然を言い訳にして', '水玉模様', '狼に口笛を', 'ハウス!']),
  ('乃木坂46', '走れ!Bicycle', 'single', 3, '乃木坂46', ARRAY['走れ!Bicycle', 'せっかちなかたつむり', '涙がまだ悲しみだった頃', '人はなぜ走るのか?', '音が出ないギター', '海流の島よ']),
  ('乃木坂46', '制服のマネキン', 'single', 4, '乃木坂46', ARRAY['制服のマネキン', '指望遠鏡', 'やさしさなら間に合ってる', 'ここじゃないどこか', '春のメロディー', '渋谷ブルース']),
  ('乃木坂46', '君の名は希望', 'single', 5, '乃木坂46', ARRAY['君の名は希望', 'シャキイズム', 'ロマンティックいか焼き', '13日の金曜日', 'でこぴん', 'サイコキネシスの可能性']),
  ('乃木坂46', 'ガールズルール', 'single', 6, '乃木坂46', ARRAY['ガールズルール', '世界で一番 孤独なLover', 'コウモリよ', '扇風機', '他の星から', '人間という楽器']),
  ('乃木坂46', 'バレッタ', 'single', 7, '乃木坂46', ARRAY['バレッタ', '月の大きさ', 'そんなバカな...', '私のために 誰かのために', '初恋の人を今でも', 'やさしさとは']),
  ('乃木坂46', '気づいたら片想い', 'single', 8, '乃木坂46', ARRAY['気づいたら片想い', 'ロマンスのスタート', '吐息のメソッド', '孤独兄弟', '生まれたままで', 'ダンケシェーン']),
  ('乃木坂46', '夏のFree&Easy', 'single', 9, '乃木坂46', ARRAY['夏のFree&Easy', '何もできずにそばにいる', 'その先の出口', '無口なライオン', 'ここにいる理由', '僕が行かなきゃ誰が行くんだ?']),
  ('乃木坂46', '何度目の青空か?', 'single', 10, '乃木坂46', ARRAY['何度目の青空か?', '遠回りの愛情', '転がった鐘を鳴らせ!', '私、起きる。', 'あの日 僕は咄嗟に嘘をついた', 'Tender days']),
  ('乃木坂46', '命は美しい', 'single', 11, '乃木坂46', ARRAY['命は美しい', 'あらかじめ語られるロマンス', '立ち直り中', 'ごめんね ずっと...', '君は僕と会わない方がよかったのかな', 'ボーダー']),
  ('乃木坂46', '太陽ノック', 'single', 12, '乃木坂46', ARRAY['太陽ノック', 'もう少しの夢', '魚たちのLOVE SONG', '無表情', '別れ際、もっと好きになる', '制服を脱いでサヨナラを...', '羽根の記憶']),
  ('乃木坂46', '今、話したい誰かがいる', 'single', 13, '乃木坂46', ARRAY['今、話したい誰かがいる', '嫉妬の権利', 'ポピパッパパー', '大人への近道', '悲しみの忘れ方', '隙間']),
  ('乃木坂46', 'ハルジオンが咲く頃', 'single', 14, '乃木坂46', ARRAY['ハルジオンが咲く頃', '遥かなるブータン', '強がる蕾', '急斜面', '釣り堀', '不等号', '憂鬱と風船ガム']),
  ('乃木坂46', '裸足でSummer', 'single', 15, '乃木坂46', ARRAY['裸足でSummer', '僕だけの光', 'オフショアガール', '命の真実 ミュージカル「林檎売りとカメムシ」', '白米様', 'シークレットグラフィティー', '行くあてのない僕たち']),
  ('乃木坂46', 'サヨナラの意味', 'single', 16, '乃木坂46', ARRAY['サヨナラの意味', '孤独な青空', 'あの教室', 'ブランコ', '2度目のキスから', '君に贈る花がない', 'ないものねだり']),
  ('乃木坂46', 'インフルエンサー', 'single', 17, '乃木坂46', ARRAY['インフルエンサー', '人生を考えたくなる', '意外BREAK', 'Another Ghost', '風船は生きている', '三番目の風', '当たり障りのない話']),
  ('乃木坂46', '逃げ水', 'single', 18, '乃木坂46', ARRAY['逃げ水', '女は一人じゃ眠れない', 'ひと夏の長さより...', 'アンダー', 'ライブ神', '未来の答え', '泣いたっていいじゃないか?']),
  ('乃木坂46', 'いつかできるから今日できる', 'single', 19, '乃木坂46', ARRAY['いつかできるから今日できる', '不眠症', 'まあいいか?', '失恋お掃除人', 'My rule', '僕の衝動', '新しい花粉 ミュージカル「見知らぬ世界」より']),
  ('乃木坂46', 'シンクロニシティ', 'single', 20, '乃木坂46', ARRAY['シンクロニシティ', 'Against', '雲になればいい', '新しい世界', 'スカウトマン', 'トキトキメキメキ', '言霊砲']),
  ('乃木坂46', 'ジコチューで行こう!', 'single', 21, '乃木坂46', ARRAY['ジコチューで行こう!', '空扉', '三角の空き地', '自分じゃない感じ', '心のモノローグ', '地球が丸いなら', 'あんなに好きだったのに...']),
  ('乃木坂46', '帰り道は遠回りしたくなる', 'single', 22, '乃木坂46', ARRAY['帰り道は遠回りしたくなる', 'キャラバンは眠らない', 'つづく', '日常', '告白の順番', 'ショパンの嘘つき', '知りたいこと']),
  ('乃木坂46', 'Sing Out!', 'single', 23, '乃木坂46', ARRAY['Sing Out!', '滑走路', 'のような存在', 'Am I Loving?', '平行線', '4番目の光', '曖昧']),
  ('乃木坂46', '夜明けまで強がらなくてもいい', 'single', 24, '乃木坂46', ARRAY['夜明けまで強がらなくてもいい', '僕のこと、知ってる?', '路面電車の街', '図書室の君へ', '時々 思い出してください', '～Do my best～じゃ意味はない', '僕の思い込み']),
  ('乃木坂46', 'しあわせの保護色', 'single', 25, '乃木坂46', ARRAY['しあわせの保護色', 'サヨナラ Stay with me', 'じゃあね。', 'アナスターシャ', '毎日がBrand new day', 'I see...', 'ファンタスティック三色パン']),
  ('乃木坂46', '僕は僕を好きになる', 'single', 26, '乃木坂46', ARRAY['僕は僕を好きになる', '明日がある理由', 'Wilderness world', '口ほどにもないKISS', '冷たい水の中', 'Out of the blue', '友情ピアス']),
  ('乃木坂46', 'ごめんねFingers crossed', 'single', 27, '乃木坂46', ARRAY['ごめんねFingers crossed', '全部 夢のまま', '大人たちには指示されない', 'ざぶんざざぶん', 'さ～ゆ～Ready?', '錆びたコンパス', '猫舌カモミールティー']),
  ('乃木坂46', '君に叱られた', 'single', 28, '乃木坂46', ARRAY['君に叱られた', 'やさしいだけなら', 'マシンガンレイン', 'もしも心が透明なら', '私の色', '泥だらけ', '他人のそら似']),
  ('乃木坂46', 'Actually...', 'single', 29, '乃木坂46', ARRAY['Actually...', '深読み', '価値あるもの', '忘れないといいな', '届かなくたって...', '絶望の一秒前', '好きになってみた']),
  ('乃木坂46', '好きというのはロックだぜ!', 'single', 30, '乃木坂46', ARRAY['好きというのはロックだぜ!', 'Under''s Love', '僕が手を叩く方へ', 'ジャンピングジョーカーフラッシュ', 'バンドエイド剥がすような別れ方', 'パッションフルーツの食べ方', '夢を見る筋肉']),
  ('乃木坂46', 'ここにはないもの', 'single', 31, '乃木坂46', ARRAY['ここにはないもの', '悪い成分', 'これから', '銭湯ラプソディー', 'アトノマツリ', '甘いエビデンス', '17分間']),
  ('乃木坂46', '人は夢を二度見る', 'single', 32, '乃木坂46', ARRAY['人は夢を二度見る', '僕たちのサヨナラ', '心にもないこと', '黄昏はいつも', 'Never say never', 'さざ波は戻らない', '涙の滑り台']),
  ('乃木坂46', 'おひとりさま天国', 'single', 33, '乃木坂46', ARRAY['おひとりさま天国', '踏んでしまった', '誰かの肩', 'マグカップとシンク', '考えないようにする', 'お別れタコス', '命の冒涜']),
  ('乃木坂46', 'Monopoly', 'single', 34, '乃木坂46', ARRAY['Monopoly', '思い出が止まらなくなる', '助手席をずっと空けていた', '羊飼いよ', '手ごねハンバーグ', 'スタイリッシュ', 'いつの日にか、あの歌を...']),
  ('乃木坂46', 'チャンスは平等', 'single', 35, '乃木坂46', ARRAY['チャンスは平等', '車道側', '「じゃあね」が切ない', 'あと7曲', 'ぶんぶくちゃがま', 'サルビアの花を覚えているかい?', '夏桜']),
  ('乃木坂46', 'チートデイ', 'single', 36, '乃木坂46', ARRAY['チートデイ', 'あの光', '落とし物', '君にDitto', '懐かない仔猫', 'Keep in touch', '熱狂の捌け口']),
  ('乃木坂46', '歩道橋', 'single', 37, '乃木坂46', ARRAY['歩道橋', 'それまでの猶予', '相対性理論に異議を唱える', '世界一のダイヤモンド', '夕陽は何色か?', '乃木坂饅頭', '雪が降る日にまた会おう']),
  ('乃木坂46', 'ネーブルオレンジ', 'single', 38, '乃木坂46', ARRAY['ネーブルオレンジ', '懐かしさの先', '交感神経優位', 'タイムリミット片想い', '天空の豆の木', '100日目', 'キスのシルエット']),
  ('乃木坂46', 'Same numbers', 'single', 39, '乃木坂46', ARRAY['Same numbers', '真夏日よ', 'なぜ 僕たちは走るのか?', 'あの頃におかえり', '不道徳な夏', 'ってかさ', '君と猫']),
  ('乃木坂46', 'ビリヤニ', 'single', 40, '乃木坂46', ARRAY['ビリヤニ', '市営ダンスホール', '純粋とは何か?', '新宿バックオフ', 'Spark a revolution!', '夢の匂い', 'ぐるぐるカーテン（6期生ver.）']),
  ('乃木坂46', '最後に階段を駆け上がったのはいつだ?', 'single', 41, '乃木坂46', ARRAY['最後に階段を駆け上がったのはいつだ?', '愛って羨ましい', '桜橋を教えてくれた', '君ばかり', '年齢の境界線', 'パシフィック・リーグに連れてって', 'もう一つの太陽']),

  -- 欅坂46
  ('欅坂46', 'サイレントマジョリティー', 'single', 1, '欅坂46', ARRAY['サイレントマジョリティー', '手を繋いで帰ろうか', '山手線', '渋谷川', '乗り遅れたバス', 'キミガイナイ']),
  ('欅坂46', '世界には愛しかない', 'single', 2, '欅坂46', ARRAY['世界には愛しかない', '語るなら未来を...', '渋谷からPARCOが消えた日', 'また会ってください', '青空が違う', 'ボブディランは返さない']),
  ('欅坂46', '世界には愛しかない', 'single', 2, 'けやき坂46', ARRAY['ひらがなけやき']),
  ('欅坂46', '二人セゾン', 'single', 3, '欅坂46', ARRAY['二人セゾン', '大人は信じてくれない', '制服と太陽', '僕たちの戦争', '夕陽1/3']),
  ('欅坂46', '二人セゾン', 'single', 3, 'けやき坂46', ARRAY['誰よりも高く跳べ!']),
  ('欅坂46', '不協和音', 'single', 4, '欅坂46', ARRAY['不協和音', 'W-KEYAKIZAKAの詩', '微笑みが悲しい', 'チューニング', '割れたスマホ', 'エキセントリック']),
  ('欅坂46', '不協和音', 'single', 4, 'けやき坂46', ARRAY['僕たちは付き合っている']),
  ('欅坂46', '風に吹かれても', 'single', 5, '欅坂46', ARRAY['風に吹かれても', '結局、じゃあねしか言えない', '避雷針', '波打ち際を走らないか?', '再生する細胞']),
  ('欅坂46', '風に吹かれても', 'single', 5, 'けやき坂46', ARRAY['それでも歩いてる', 'NO WAR in the future']),
  ('欅坂46', 'ガラスを割れ!', 'single', 6, '欅坂46', ARRAY['ガラスを割れ!', 'もう森へ帰ろうか?', '夜明けの孤独', 'ゼンマイ仕掛けの夢', 'バスルームトラベル']),
  ('欅坂46', 'ガラスを割れ!', 'single', 6, 'けやき坂46', ARRAY['イマニミテイロ', '半分の記憶']),
  ('欅坂46', 'アンビバレント', 'single', 7, '欅坂46', ARRAY['アンビバレント', 'Student Dance', 'I''m out', '302号室', '音楽室に片想い', '日が昇るまで']),
  ('欅坂46', 'アンビバレント', 'single', 7, 'けやき坂46', ARRAY['ハッピーオーラ']),
  ('欅坂46', '黒い羊', 'single', 8, '欅坂46', ARRAY['黒い羊', 'Nobody', 'ヒールの高さ', 'ごめんね クリスマス', '否定した未来']),
  ('欅坂46', '黒い羊', 'single', 8, 'けやき坂46', ARRAY['君に話しておきたいこと', '抱きしめてやる']),
  ('欅坂46', '誰がその鐘を鳴らすのか?', 'digital_single', NULL, '欅坂46', ARRAY['誰がその鐘を鳴らすのか?']),

  -- 櫻坂46
  ('櫻坂46', 'Nobody''s fault', 'single', 1, '櫻坂46', ARRAY['Nobody''s fault', 'なぜ 恋をして来なかったんだろう?', '半信半疑', 'Plastic regret', '最終の地下鉄に乗って', 'Buddies', 'ブルームーンキス']),
  ('櫻坂46', 'BAN', 'single', 2, '櫻坂46', ARRAY['BAN', '偶然の答え', 'それが愛なのね', '君と僕と洗濯物', 'Microscope', '思ったよりも寂しくない', '櫻坂の詩']),
  ('櫻坂46', '流れ弾', 'single', 3, '櫻坂46', ARRAY['流れ弾', 'Dead end', 'ソニア', 'ジャマイカビール', 'On my way', '無言の宇宙', '美しきNervous']),
  ('櫻坂46', '五月雨よ', 'single', 4, '櫻坂46', ARRAY['五月雨よ', '僕のジレンマ', 'I''m in', '断絶', '制服の人魚', '車間距離', '恋が絶滅する日']),
  ('櫻坂46', '桜月', 'single', 5, '櫻坂46', ARRAY['桜月', 'Cool', '無念', 'もしかしたら真実', '魂のLiar', '夏の近道', 'その日まで']),
  ('櫻坂46', 'Start over!', 'single', 6, '櫻坂46', ARRAY['Start over!', '静寂の暴力', '風の音', 'コンビナート', 'Anthem time', '一瞬の馬', 'ドローン旋回中']),
  ('櫻坂46', '承認欲求', 'single', 7, '櫻坂46', ARRAY['承認欲求', 'マモリビト', '確信的クロワッサン', '僕たちの La vie en rose', 'マンホールの蓋の上', '隙間風よ', 'Don''t cut in line!']),
  ('櫻坂46', '何歳の頃に戻りたいのか?', 'single', 8, '櫻坂46', ARRAY['何歳の頃に戻りたいのか?', '何度 LOVE SONGの歌詞を読み返しただろう', '油を注せ!', '真夏に何か起きるのかしら', '心の影絵', '恋は向いてない', '泣かせて Hold me tight!']),
  ('櫻坂46', '自業自得', 'single', 9, '櫻坂46', ARRAY['自業自得', '引きこもる時間はない', '愛し合いなさい', 'イザベルについて', '縁起担ぎ', '標識', 'もう一曲 欲しいのかい?']),
  ('櫻坂46', 'I want tomorrow to come', 'single', 10, '櫻坂46', ARRAY['I want tomorrow to come', '本質的なこと', '僕は僕を好きになれない', '今さらSuddenly', '嵐の前、世界の終わり', '19歳のガレット', 'TOKYO SNOW']),
  ('櫻坂46', 'UDAGAWA GENERATION', 'single', 11, '櫻坂46', ARRAY['UDAGAWA GENERATION', 'Nightmare症候群', 'Nothing special', '紋白蝶が確か飛んでた', '行かないで', 'ULTRAVIOLET', 'やるしかないじゃん']),
  ('櫻坂46', 'Make or Break', 'single', 12, '櫻坂46', ARRAY['Make or Break', '死んだふり', '港区パセリ', '恋愛無双', '真夏の大統領', '君のことを想いながら', 'ノンアルコール']),
  ('櫻坂46', 'Unhappy birthday構文', 'single', 13, '櫻坂46', ARRAY['Unhappy birthday構文', 'Alter ego', '木枯らしは泣かない', '青空が見えるまで', 'I will be', 'Buddies (English Version)', '夜空で一番輝いてる星の名前を僕は知らない']),
  ('櫻坂46', 'The growing up train', 'single', 14, '櫻坂46', ARRAY['The growing up train', '光源', 'ドライフルーツ', 'キスが苦い', 'くらげらしく', 'Sunny side up', '僕は向いてない']),
  ('櫻坂46', 'Lonesome rabbit/What''s "KAZOKU"?', 'single', 15, '櫻坂46', ARRAY['Lonesome rabbit', 'What''s "KAZOKU"?']),

  -- 日向坂46
  ('日向坂46', 'キュン', 'single', 1, '日向坂46', ARRAY['キュン', 'JOYFUL LOVE', '耳に落ちる涙', 'Footsteps', 'ときめき草', '沈黙が愛なら']),
  ('日向坂46', 'ドレミソラシド', 'single', 2, '日向坂46', ARRAY['ドレミソラシド', 'キツネ', 'My god', 'Cage', 'やさしさが邪魔をする', 'Dash&Rush']),
  ('日向坂46', 'こんなに好きになっちゃっていいの?', 'single', 3, '日向坂46', ARRAY['こんなに好きになっちゃっていいの?', 'ホントの時間', 'まさか 偶然...', '一番好きだとみんなに言っていた小説のタイトルを思い出せない', 'ママのドレス', '川は流れる']),
  ('日向坂46', 'ソンナコトナイヨ', 'single', 4, '日向坂46', ARRAY['ソンナコトナイヨ', '青春の馬', '好きということは...', '窓を開けなくても', 'ナゼー', '君のため何ができるだろう']),
  ('日向坂46', '君しか勝たん', 'single', 5, '日向坂46', ARRAY['君しか勝たん', '声の足跡', '嘆きのDelete', 'Right?', 'どうする?どうする?どうする?', '世界にはThank you!が溢れている', '膨大な夢に押し潰されて']),
  ('日向坂46', 'ってか', 'single', 6, '日向坂46', ARRAY['ってか', '何度でも何度でも', '思いがけないダブルレインボー', '夢は何歳まで?', 'あくびLetter', '酸っぱい自己嫌悪', 'アディショナルタイム']),
  ('日向坂46', '僕なんか', 'single', 7, '日向坂46', ARRAY['僕なんか', '飛行機雲ができる理由', 'もうこんなに好きになれない', 'ゴーフルと君', '真夜中の懺悔大会', '恋した魚は空を飛ぶ', '知らないうちに愛されていた']),
  ('日向坂46', '月と星が踊るMidnight', 'single', 8, '日向坂46', ARRAY['月と星が踊るMidnight', 'HEY!OHISAMA!', '孤独な瞬間', '10秒天使', 'その他大勢タイプ', 'ブルーベリー&ラズベリー', '一生一度の夏']),
  ('日向坂46', 'One choice', 'single', 9, '日向坂46', ARRAY['One choice', '恋は逃げ足が早い', '愛はこっちのものだ', 'You''re in my way', 'パクチー ピーマン グリーンピース', 'シーラカンス', '友よ 一番星だ']),
  ('日向坂46', 'Am I ready?', 'single', 10, '日向坂46', ARRAY['Am I ready?', '見たことない魔物', '接触と感情', '骨組みだらけの夏休み', '君は逆立ちできるか?', '愛のひきこもり', 'ガラス窓が汚れてる']),
  ('日向坂46', '君はハニーデュー', 'single', 11, '日向坂46', ARRAY['君はハニーデュー', '錆つかない剣を持て!', 'どこまでが道なんだ?', '恋とあんバター', '夜明けのスピード', '雨が降ったって', '僕に続け']),
  ('日向坂46', '絶対的第六感', 'single', 12, '日向坂46', ARRAY['絶対的第六感', '君を覚えてない', '永遠のソフィア', '夕陽Dance', '妄想コスモス', '雪は降る 心の世界に', '君のために何ができるだろう']),
  ('日向坂46', '卒業写真だけが知ってる', 'single', 13, '日向坂46', ARRAY['卒業写真だけが知ってる', 'SUZUKA', '孤独たちよ', 'あの娘にグイグイ', '43年待ちのコロッケ', 'Instead of you', '足の小指を箪笥の角にぶつけた']),
  ('日向坂46', 'Love yourself!', 'single', 14, '日向坂46', ARRAY['Love yourself!', 'German Iris', 'You are forever', 'やらかした', 'What you like!', 'あのね そのね', '海風とわがまま']),
  ('日向坂46', 'お願いバッハ!', 'single', 15, '日向坂46', ARRAY['お願いバッハ!', '空飛ぶ車', 'ただがむしゃらに', '君のしか勝たんのだ', 'キレイになりたい', 'まさかのConfession', '言葉は限りなく不自由だ']),
  ('日向坂46', 'クリフハンガー', 'single', 16, '日向坂46', ARRAY['クリフハンガー', '涙目の太陽', 'Surf''s Up Girl', '好きになるクレッシェンド']),
  ('日向坂46', 'Kind of love', 'single', 17, '日向坂46', ARRAY['Kind of love']);

CREATE TEMP TABLE orbit_seed_single_tracks ON COMMIT PRESERVE ROWS AS
SELECT
  groups.release_group_name,
  groups.release_title,
  groups.release_type,
  groups.release_numbering,
  groups.track_group_name,
  track_title,
  track_order::INT
FROM orbit_seed_single_track_groups groups
CROSS JOIN LATERAL unnest(groups.track_titles) WITH ORDINALITY AS tracks(track_title, track_order);

CREATE TEMP TABLE orbit_seed_resolved_single_tracks ON COMMIT PRESERVE ROWS AS
SELECT
  seed.*,
  release.id AS release_id,
  track_group.id AS track_group_id
FROM orbit_seed_single_tracks seed
JOIN public.orbit_groups release_group
  ON release_group.name_ja = seed.release_group_name
JOIN public.orbit_releases release
  ON release.title = seed.release_title
  AND release.group_id = release_group.id
  AND release.release_type = seed.release_type
  AND release.numbering IS NOT DISTINCT FROM seed.release_numbering
JOIN public.orbit_groups track_group
  ON track_group.name_ja = seed.track_group_name;

INSERT INTO public.orbit_tracks (
  title,
  group_id
)
SELECT DISTINCT
  seed.track_title,
  seed.track_group_id
FROM orbit_seed_resolved_single_tracks seed
WHERE NOT EXISTS (
  SELECT 1
  FROM public.orbit_tracks existing
  WHERE existing.title = seed.track_title
    AND existing.group_id = seed.track_group_id
);

WITH missing_links AS (
  SELECT
    seed.release_id,
    track.id AS track_id,
    seed.track_order,
    seed.track_title
  FROM orbit_seed_resolved_single_tracks seed
  JOIN public.orbit_tracks track
    ON track.title = seed.track_title
    AND track.group_id = seed.track_group_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.orbit_release_tracks existing
    WHERE existing.release_id = seed.release_id
      AND existing.track_id = track.id
  )
),
current_max AS (
  SELECT
    release_id,
    MAX(track_number) AS max_track_number
  FROM public.orbit_release_tracks
  GROUP BY release_id
),
numbered_links AS (
  SELECT
    missing.release_id,
    missing.track_id,
    COALESCE(current_max.max_track_number, 0)
      + ROW_NUMBER() OVER (
          PARTITION BY missing.release_id
          ORDER BY missing.track_order, missing.track_title
        ) AS track_number
  FROM missing_links missing
  LEFT JOIN current_max
    ON current_max.release_id = missing.release_id
)
INSERT INTO public.orbit_release_tracks (
  release_id,
  track_id,
  track_number
)
SELECT
  release_id,
  track_id,
  track_number::INT
FROM numbered_links
ON CONFLICT (release_id, track_id) DO NOTHING;

DROP TABLE IF EXISTS orbit_seed_resolved_single_tracks;
DROP TABLE IF EXISTS orbit_seed_single_tracks;
DROP TABLE IF EXISTS orbit_seed_single_track_groups;

END;
$seed$;
