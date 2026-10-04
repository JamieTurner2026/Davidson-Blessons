// Curated question bank. Every item cites a verse (BSB) so it can be checked —
// run `npx tsx scripts/verify-trivia.ts` after editing. Answers are stored first;
// options are shuffled at play time.

export interface TriviaItem {
  kind: "trivia";
  q: string;
  a: string;
  wrong: [string, string, string];
  ref: string;
}

export interface WhoItem {
  kind: "who";
  /** Short quote in BSB wording — checked against the verse text. */
  quote: string;
  a: string;
  wrong: [string, string, string];
  ref: string;
}

export interface PairItem {
  kind: "pair";
  left: string;
  right: string;
  ref: string;
}

export interface TimelineItem {
  kind: "timeline";
  title: string;
  events: Array<{ text: string; ref: string }>;
}

export type BankItem = TriviaItem | WhoItem | PairItem | TimelineItem;

const t = (q: string, a: string, wrong: [string, string, string], ref: string): TriviaItem => ({ kind: "trivia", q, a, wrong, ref });
const who = (quote: string, a: string, wrong: [string, string, string], ref: string): WhoItem => ({ kind: "who", quote, a, wrong, ref });
const pair = (left: string, right: string, ref: string): PairItem => ({ kind: "pair", left, right, ref });
const line = (title: string, events: Array<[string, string]>): TimelineItem => ({
  kind: "timeline",
  title,
  events: events.map(([text, ref]) => ({ text, ref })),
});

export const TRIVIA: ReadonlyArray<TriviaItem> = [
  // ── The Law ──
  t("On which day did God create mankind?", "The sixth day", ["The third day", "The fifth day", "The seventh day"], "GEN.1.31"),
  t("What did God form the first man from?", "Dust of the ground", ["A rib", "Water", "Stone"], "GEN.2.7"),
  t("What was the name of the son born to Adam and Eve after Abel's death?", "Seth", ["Enoch", "Lamech", "Enosh"], "GEN.4.25"),
  t("What sign did God give of His covenant with Noah?", "A rainbow", ["A dove", "An olive branch", "A star"], "GEN.9.13"),
  t("Which bird returned to Noah with an olive leaf?", "A dove", ["A raven", "A sparrow", "An eagle"], "GEN.8.11"),
  t("Which city did Abram's family set out from?", "Ur of the Chaldeans", ["Haran", "Bethel", "Hebron"], "GEN.11.31"),
  t("What new name did God give to Abram's wife Sarai?", "Sarah", ["Rebekah", "Rachel", "Leah"], "GEN.17.15"),
  t("What was the name of the son born to Abraham and Sarah?", "Isaac", ["Ishmael", "Jacob", "Esau"], "GEN.21.3"),
  t("Who became Isaac's wife?", "Rebekah", ["Rachel", "Leah", "Hagar"], "GEN.24.67"),
  t("What did Esau sell to Jacob for a meal?", "His birthright", ["His flocks", "His well", "His robe"], "GEN.25.33"),
  t("What new name did God give Jacob?", "Israel", ["Abraham", "Judah", "Joseph"], "GEN.32.28"),
  t("How many sons did Jacob have?", "Twelve", ["Ten", "Seven", "Fourteen"], "GEN.35.22"),
  t("What special gift did Jacob make for Joseph?", "A robe of many colors", ["A golden ring", "A silver cup", "A shepherd's staff"], "GEN.37.3"),
  t("In which land did Joseph rise to power?", "Egypt", ["Canaan", "Babylon", "Assyria"], "GEN.41.41"),
  t("Who found baby Moses in a basket on the Nile?", "Pharaoh's daughter", ["Miriam", "Jochebed", "Zipporah"], "EXO.2.5"),
  t("What did God speak to Moses from?", "A burning bush", ["A pillar of cloud", "A whirlwind", "A mountain cave"], "EXO.3.2"),
  t("What was the final plague on Egypt?", "Death of the firstborn", ["Darkness", "Locusts", "Hail"], "EXO.12.29"),
  t("What bread did God send Israel in the wilderness?", "Manna", ["Unleavened bread", "Barley loaves", "Showbread"], "EXO.16.31"),
  t("On which mountain did Moses receive the tablets of the covenant?", "Mount Sinai", ["Mount Carmel", "Mount Zion", "Mount of Olives"], "EXO.31.18"),
  t("What idol did Israel make while Moses was on the mountain?", "A golden calf", ["A bronze serpent", "A golden lampstand", "A stone pillar"], "EXO.32.4"),
  t("Who was Moses' brother?", "Aaron", ["Joshua", "Caleb", "Hur"], "EXO.4.14"),
  t("For how many years did Israel wander in the wilderness?", "Forty", ["Seven", "Twelve", "Seventy"], "NUM.14.33"),
  t("What did Moses lift up so that bitten Israelites could live?", "A bronze snake", ["A golden calf", "The ark", "A lampstand"], "NUM.21.9"),
  t("Whose donkey spoke to him?", "Balaam's", ["Balak's", "Gideon's", "Saul's"], "NUM.22.28"),
  t("Which two spies urged Israel to trust God and enter the land?", "Joshua and Caleb", ["Moses and Aaron", "Eldad and Medad", "Nadab and Abihu"], "NUM.14.6"),
  t("Who led Israel after Moses died?", "Joshua", ["Aaron", "Caleb", "Eleazar"], "DEU.34.9"),
  t("“Love the LORD your God with all your heart” is first written in which book?", "Deuteronomy", ["Leviticus", "Exodus", "Numbers"], "DEU.6.5"),
  t("“Love your neighbor as yourself” first appears in which book?", "Leviticus", ["Deuteronomy", "Exodus", "Matthew"], "LEV.19.18"),
  // ── History ──
  t("Which city's walls fell after Israel marched around it?", "Jericho", ["Ai", "Jerusalem", "Hebron"], "JOS.6.20"),
  t("Who hid the Israelite spies in Jericho?", "Rahab", ["Deborah", "Ruth", "Jael"], "JOS.2.4"),
  t("Which prophetess was judging Israel when Barak fought Sisera?", "Deborah", ["Jael", "Hannah", "Miriam"], "JDG.4.4"),
  t("How many men did God use with Gideon to defeat Midian?", "300", ["3,000", "30", "10,000"], "JDG.7.7"),
  t("What did Samson say would take away his strength if cut?", "His hair", ["His beard", "His cloak", "His sandals"], "JDG.16.17"),
  t("Who betrayed Samson to the Philistines?", "Delilah", ["Jael", "Rahab", "Jezebel"], "JDG.16.18"),
  t("With whom did Ruth return to Bethlehem?", "Naomi", ["Orpah", "Rachel", "Hannah"], "RUT.1.22"),
  t("Whom did Ruth marry?", "Boaz", ["Obed", "Elimelech", "Jesse"], "RUT.4.13"),
  t("Ruth's son Obed became the grandfather of which king?", "David", ["Saul", "Solomon", "Josiah"], "RUT.4.17"),
  t("Who prayed for a son and named him Samuel?", "Hannah", ["Peninnah", "Elizabeth", "Sarah"], "1SA.1.20"),
  t("Who was Israel's first king?", "Saul", ["David", "Samuel", "Solomon"], "1SA.10.1"),
  t("What did David strike Goliath with?", "A stone from his sling", ["A sword", "A spear", "His bare hands"], "1SA.17.49"),
  t("Which prophet confronted David after his sin with Bathsheba?", "Nathan", ["Gad", "Samuel", "Elijah"], "2SA.12.7"),
  t("What did Solomon ask God to give him?", "A discerning heart to govern", ["Great riches", "A long life", "Victory over his enemies"], "1KI.3.9"),
  t("Who built the first temple in Jerusalem?", "Solomon", ["David", "Hezekiah", "Zerubbabel"], "1KI.6.14"),
  t("Which queen came to test Solomon with hard questions?", "The queen of Sheba", ["Jezebel", "Esther", "Vashti"], "1KI.10.1"),
  t("Where did Elijah challenge the prophets of Baal?", "Mount Carmel", ["Mount Sinai", "Mount Moriah", "Mount Hermon"], "1KI.18.20"),
  t("What brought Elijah food by the brook Cherith?", "Ravens", ["Doves", "An angel", "Quail"], "1KI.17.6"),
  t("How was Elijah taken up to heaven?", "In a whirlwind", ["In a cloud", "On a mountain top", "In his sleep"], "2KI.2.11"),
  t("Who asked Elijah for a double portion of his spirit?", "Elisha", ["Gehazi", "Jehu", "Isaiah"], "2KI.2.9"),
  t("How many times did Naaman dip in the Jordan to be healed?", "Seven", ["Three", "Ten", "Twelve"], "2KI.5.14"),
  t("Which king of Babylon destroyed Jerusalem?", "Nebuchadnezzar", ["Cyrus", "Darius", "Sennacherib"], "2KI.25.8"),
  t("Which king of Persia let the exiles return to rebuild the temple?", "Cyrus", ["Darius", "Xerxes", "Artaxerxes"], "EZR.1.1"),
  t("Who led the rebuilding of Jerusalem's walls?", "Nehemiah", ["Ezra", "Zerubbabel", "Haggai"], "NEH.2.17"),
  t("In how many days was the wall of Jerusalem finished?", "52", ["40", "70", "100"], "NEH.6.15"),
  t("Who became queen of Persia in place of Vashti?", "Esther", ["Ruth", "Deborah", "Abigail"], "EST.2.17"),
  t("Who raised Esther as his own daughter?", "Mordecai", ["Haman", "Hegai", "Xerxes"], "EST.2.7"),
  t("Who plotted to destroy all the Jews in the book of Esther?", "Haman", ["Mordecai", "Hegai", "Bigthan"], "EST.3.6"),
  // ── Poetry & Wisdom ──
  t("In which land did Job live?", "Uz", ["Ur", "Edom", "Moab"], "JOB.1.1"),
  t("Psalm 23 calls the LORD my…", "Shepherd", ["King", "Rock", "Fortress"], "PSA.23.1"),
  t("“Your word is a lamp to my feet” is in which psalm?", "Psalm 119", ["Psalm 23", "Psalm 91", "Psalm 150"], "PSA.119.105"),
  t("“The fear of the LORD is the beginning of knowledge” opens which book?", "Proverbs", ["Psalms", "Ecclesiastes", "Job"], "PRO.1.7"),
  t("“To everything there is a season” — which book?", "Ecclesiastes", ["Proverbs", "Psalms", "Song of Songs"], "ECC.3.1"),
  t("“Trust in the LORD with all your heart, and lean not on your own…”", "understanding", ["strength", "wisdom", "ways"], "PRO.3.5"),
  t("Proverbs 31 praises a wife of…", "Noble character", ["Great beauty", "Royal birth", "Many riches"], "PRO.31.10"),
  // ── Prophets ──
  t("Isaiah saw the Lord on His throne in the year which king died?", "Uzziah", ["Hezekiah", "Ahaz", "Josiah"], "ISA.6.1"),
  t("Where did God send Jeremiah to learn a lesson about clay?", "The potter's house", ["The carpenter's shop", "The sheepfold", "The king's palace"], "JER.18.2"),
  t("What filled the valley in Ezekiel's vision?", "Dry bones", ["Chariots", "Sheep", "Olive trees"], "EZK.37.1"),
  t("Who was thrown into the lions' den?", "Daniel", ["Jeremiah", "Ezekiel", "Elijah"], "DAN.6.16"),
  t("Who were thrown into the blazing furnace?", "Shadrach, Meshach and Abednego", ["Daniel and Hananiah", "Ezra and Nehemiah", "Joshua and Caleb"], "DAN.3.20"),
  t("Which king held the feast where a hand wrote on the wall?", "Belshazzar", ["Nebuchadnezzar", "Darius", "Cyrus"], "DAN.5.1"),
  t("Which prophet married Gomer?", "Hosea", ["Amos", "Joel", "Micah"], "HOS.1.3"),
  t("What swallowed Jonah?", "A great fish", ["A sea serpent", "A whirlpool", "A storm cloud"], "JON.1.17"),
  t("To which city did God send Jonah?", "Nineveh", ["Tarshish", "Joppa", "Babylon"], "JON.1.2"),
  t("“Act justly, love mercy, walk humbly with your God” — which prophet?", "Micah", ["Amos", "Hosea", "Isaiah"], "MIC.6.8"),
  t("Micah foretold the ruler of Israel would come from…", "Bethlehem", ["Nazareth", "Jerusalem", "Hebron"], "MIC.5.2"),
  t("What was Amos before God called him to prophesy?", "A herdsman", ["A priest", "A scribe", "A fisherman"], "AMO.7.14"),
  t("“Bring the full tithe into the storehouse” — which book?", "Malachi", ["Haggai", "Zechariah", "Joel"], "MAL.3.10"),
  t("“Not by might nor by power, but by My Spirit” was a word to…", "Zerubbabel", ["Joshua the high priest", "Ezra", "Nehemiah"], "ZEC.4.6"),
  // ── Gospels ──
  t("In which town was Jesus born?", "Bethlehem", ["Nazareth", "Jerusalem", "Capernaum"], "MAT.2.1"),
  t("Who baptized Jesus?", "John the Baptist", ["Peter", "Andrew", "James"], "MAT.3.13"),
  t("How many days did Jesus fast in the wilderness?", "Forty", ["Seven", "Three", "Twelve"], "MAT.4.2"),
  t("Where did Jesus turn water into wine?", "Cana in Galilee", ["Bethany", "Capernaum", "Nain"], "JHN.2.11"),
  t("How many apostles did Jesus choose?", "Twelve", ["Seventy", "Seven", "Three"], "LUK.6.13"),
  t("Which disciple was sitting at a tax booth when Jesus called him?", "Matthew", ["Thomas", "Andrew", "Philip"], "MAT.9.9"),
  t("What did the disciples have when Jesus fed the five thousand?", "Five loaves and two fish", ["Seven loaves and a few fish", "Two loaves and five fish", "Twelve baskets of bread"], "MAT.14.17"),
  t("Which disciple walked on the water toward Jesus?", "Peter", ["John", "Andrew", "James"], "MAT.14.29"),
  t("For how many pieces of silver did Judas agree to betray Jesus?", "Thirty", ["Ten", "Twenty", "Forty"], "MAT.26.15"),
  t("Who was made to carry Jesus' cross?", "Simon of Cyrene", ["Joseph of Arimathea", "Simon Peter", "Nicodemus"], "MRK.15.21"),
  t("Which Pharisee came to Jesus at night?", "Nicodemus", ["Gamaliel", "Caiaphas", "Simon"], "JHN.3.1"),
  t("Who were Lazarus's sisters?", "Mary and Martha", ["Mary and Salome", "Martha and Joanna", "Elizabeth and Anna"], "JHN.11.1"),
  t("In the parable, who helped the man beaten by robbers?", "A Samaritan", ["A priest", "A Levite", "An innkeeper"], "LUK.10.33"),
  t("What did the father prepare when the prodigal son came home?", "The fattened calf", ["A lamb", "A goat", "A ram"], "LUK.15.23"),
  t("Which tax collector climbed a tree to see Jesus?", "Zacchaeus", ["Matthew", "Bartimaeus", "Nicodemus"], "LUK.19.4"),
  t("Who told the disciples, “I have seen the Lord!” on Easter morning?", "Mary Magdalene", ["Peter", "Joanna", "Mary the mother of Jesus"], "JHN.20.18"),
  t("Which disciple wanted to touch Jesus' wounds before believing?", "Thomas", ["Philip", "Bartholomew", "Peter"], "JHN.20.27"),
  t("“I am the vine; you are the…”", "branches", ["fruit", "roots", "gardeners"], "JHN.15.5"),
  t("Which Gospel begins “In the beginning was the Word”?", "John", ["Matthew", "Mark", "Luke"], "JHN.1.1"),
  t("Which angel was sent to Mary in Nazareth?", "Gabriel", ["Michael", "Raphael", "Uriel"], "LUK.1.26"),
  t("Which elderly prophetess spoke about baby Jesus in the temple?", "Anna", ["Elizabeth", "Hannah", "Joanna"], "LUK.2.36"),
  t("“Blessed are the poor in spirit” opens which teaching?", "The Sermon on the Mount", ["The Olivet Discourse", "The Upper Room Discourse", "Peter's Pentecost sermon"], "MAT.5.3"),
  // ── Acts ──
  t("What rested on each disciple at Pentecost?", "Tongues like fire", ["A dove", "A rainbow", "A pillar of cloud"], "ACT.2.3"),
  t("About how many people were added to the church at Pentecost?", "Three thousand", ["One hundred twenty", "Five thousand", "Five hundred"], "ACT.2.41"),
  t("Who was stoned while praying for his killers?", "Stephen", ["James", "Peter", "Philip"], "ACT.7.59"),
  t("On the road to which city did Saul meet the risen Jesus?", "Damascus", ["Jerusalem", "Emmaus", "Jericho"], "ACT.9.3"),
  t("Who were going up to the temple when a lame man was healed?", "Peter and John", ["Paul and Barnabas", "Paul and Silas", "Philip and Stephen"], "ACT.3.1"),
  t("Who baptized the Ethiopian official?", "Philip", ["Peter", "Paul", "Stephen"], "ACT.8.38"),
  t("Where were the disciples first called Christians?", "Antioch", ["Jerusalem", "Rome", "Corinth"], "ACT.11.26"),
  t("Which young man fell from a window during Paul's long talk?", "Eutychus", ["Timothy", "Tychicus", "Mark"], "ACT.20.9"),
  t("On which island was Paul shipwrecked?", "Malta", ["Cyprus", "Crete", "Patmos"], "ACT.28.1"),
  t("Whom did the Spirit set apart with Saul for the first mission?", "Barnabas", ["Silas", "Timothy", "Luke"], "ACT.13.2"),
  t("In which city did Paul and Silas meet Lydia?", "Philippi", ["Ephesus", "Corinth", "Thessalonica"], "ACT.16.14"),
  // ── Letters ──
  t("“The wages of sin is death” — which letter?", "Romans", ["Galatians", "Hebrews", "James"], "ROM.6.23"),
  t("Which chapter ends, “The greatest of these is love”?", "1 Corinthians 13", ["Romans 8", "John 3", "1 John 4"], "1CO.13.13"),
  t("Which letter lists love, joy and peace as fruit of the Spirit?", "Galatians", ["Ephesians", "Colossians", "Romans"], "GAL.5.22"),
  t("“Put on the full armor of God” — which letter?", "Ephesians", ["Philippians", "Colossians", "1 Thessalonians"], "EPH.6.11"),
  t("“I can do all things through Christ” — which letter?", "Philippians", ["Ephesians", "Romans", "2 Timothy"], "PHP.4.13"),
  t("Which book defines faith as “the assurance of what we hope for”?", "Hebrews", ["Romans", "James", "1 Peter"], "HEB.11.1"),
  t("“Faith without deeds is dead” — which letter?", "James", ["Romans", "Galatians", "Hebrews"], "JAS.2.26"),
  t("Which short letter appeals for a runaway named Onesimus?", "Philemon", ["Titus", "Jude", "3 John"], "PHM.1.10"),
  t("Paul wrote two letters to which young co-worker?", "Timothy", ["Titus", "Silas", "Apollos"], "2TI.1.2"),
  t("“God is love” — which letter?", "1 John", ["Romans", "1 Peter", "Jude"], "1JN.4.8"),
  // ── Revelation ──
  t("To how many churches was Revelation first sent?", "Seven", ["Twelve", "Three", "Four"], "REV.1.11"),
  t("On which island did John receive the Revelation?", "Patmos", ["Malta", "Cyprus", "Crete"], "REV.1.9"),
  t("What are the gates of the New Jerusalem made of?", "Pearls", ["Gold", "Jasper", "Sapphire"], "REV.21.21"),
  t("Which church was told it was “lukewarm”?", "Laodicea", ["Ephesus", "Smyrna", "Sardis"], "REV.3.14"),
];

export const WHO_SAID: ReadonlyArray<WhoItem> = [
  who("Let there be light", "God", ["Moses", "Adam", "Noah"], "GEN.1.3"),
  who("Am I my brother's keeper?", "Cain", ["Abel", "Adam", "Esau"], "GEN.4.9"),
  who("God Himself will provide the lamb", "Abraham", ["Isaac", "Jacob", "Moses"], "GEN.22.8"),
  who("I will not let You go unless You bless me", "Jacob", ["Esau", "Isaac", "Joseph"], "GEN.32.26"),
  who("You intended to harm me, but God intended it for good", "Joseph", ["Jacob", "Judah", "Reuben"], "GEN.50.20"),
  who("I AM WHO I AM", "God", ["Moses", "Aaron", "An angel"], "EXO.3.14"),
  who("As for me and my house, we will serve the LORD", "Joshua", ["Moses", "Caleb", "Samuel"], "JOS.24.15"),
  who("Where you go, I will go", "Ruth", ["Naomi", "Orpah", "Esther"], "RUT.1.16"),
  who("Speak, for Your servant is listening", "Samuel", ["Eli", "David", "Hannah"], "1SA.3.10"),
  who("I come against you in the name of the LORD of Hosts", "David", ["Saul", "Jonathan", "Samuel"], "1SA.17.45"),
  who("You are the man!", "Nathan", ["Samuel", "Gad", "Elijah"], "2SA.12.7"),
  who("How long will you waver between two opinions?", "Elijah", ["Elisha", "Ahab", "Obadiah"], "1KI.18.21"),
  who("If I perish, I perish", "Esther", ["Mordecai", "Ruth", "Vashti"], "EST.4.16"),
  who("The LORD gave, and the LORD has taken away", "Job", ["Eliphaz", "Elihu", "Bildad"], "JOB.1.21"),
  who("Here am I. Send me!", "Isaiah", ["Jeremiah", "Ezekiel", "Samuel"], "ISA.6.8"),
  who("Before I formed you in the womb I knew you", "The LORD, to Jeremiah", ["Elizabeth, to Mary", "Gabriel, to Zechariah", "Hannah, to Samuel"], "JER.1.5"),
  who("Salvation is from the LORD", "Jonah", ["Jeremiah", "Daniel", "Elijah"], "JON.2.9"),
  who("the Lamb of God, who takes away the sin of the world", "John the Baptist", ["Peter", "Andrew", "Simeon"], "JHN.1.29"),
  who("I am the bread of life", "Jesus", ["John the Baptist", "Moses", "Peter"], "JHN.6.35"),
  who("You are the Christ, the Son of the living God", "Peter", ["John", "Thomas", "Andrew"], "MAT.16.16"),
  who("My Lord and my God!", "Thomas", ["Peter", "John", "Philip"], "JHN.20.28"),
  who("I find no basis for a charge against Him", "Pilate", ["Herod", "Caiaphas", "Annas"], "JHN.18.38"),
  who("Truly this was the Son of God!", "The centurion", ["Pilate", "Joseph of Arimathea", "Peter"], "MAT.27.54"),
  who("remember me when You come into Your kingdom", "The criminal on the cross", ["Peter", "Zacchaeus", "Bartimaeus"], "LUK.23.42"),
  who("I am the Lord's servant", "Mary", ["Elizabeth", "Anna", "Martha"], "LUK.1.38"),
  who("My soul magnifies the Lord", "Mary", ["Elizabeth", "Hannah", "Anna"], "LUK.1.46"),
  who("You have the words of eternal life", "Peter", ["John", "Martha", "Nicodemus"], "JHN.6.68"),
  who("I was blind, but now I see", "The man born blind", ["Lazarus", "Nicodemus", "Zacchaeus"], "JHN.9.25"),
  who("Silver or gold I do not have, but what I have I give you", "Peter", ["Paul", "John", "Barnabas"], "ACT.3.6"),
  who("Lord, do not hold this sin against them", "Stephen", ["Paul", "James", "Peter"], "ACT.7.60"),
  who("Believe in the Lord Jesus, and you will be saved", "Paul and Silas", ["Peter and John", "Philip", "Barnabas"], "ACT.16.31"),
  who("I have fought the good fight, I have finished the race", "Paul", ["Peter", "Timothy", "John"], "2TI.4.7"),
  who("For to me, to live is Christ and to die is gain", "Paul", ["Peter", "James", "John"], "PHP.1.21"),
  who("I stand at the door and knock", "Jesus", ["John", "An angel", "Paul"], "REV.3.20"),
  who("I am the Alpha and the Omega", "The Lord God", ["John", "An elder", "Michael"], "REV.1.8"),
  who("not My will, but Yours be done", "Jesus", ["Peter", "Mary", "Paul"], "LUK.22.42"),
  who("I bring you good news of great joy", "An angel of the Lord", ["Simeon", "Zechariah", "Elizabeth"], "LUK.2.10"),
  who("let him who is without sin among you be the first to cast a stone", "Jesus", ["Peter", "Pilate", "Nicodemus"], "JHN.8.7"),
  who("Who do people say the Son of Man is?", "Jesus", ["Herod", "Pilate", "John the Baptist"], "MAT.16.13"),
];

export const PAIRS: ReadonlyArray<PairItem> = [
  pair("Noah", "The ark", "GEN.6.14"),
  pair("Moses", "Burning bush", "EXO.3.2"),
  pair("David", "Goliath", "1SA.17.49"),
  pair("Daniel", "Lions' den", "DAN.6.16"),
  pair("Jonah", "Great fish", "JON.1.17"),
  pair("Elijah", "Mount Carmel", "1KI.18.20"),
  pair("Joseph", "Robe of many colors", "GEN.37.3"),
  pair("Samson", "Uncut hair", "JDG.16.17"),
  pair("Ruth", "Boaz", "RUT.4.13"),
  pair("Esther", "Mordecai", "EST.2.7"),
  pair("Abraham", "Isaac", "GEN.21.3"),
  pair("Jacob", "Renamed Israel", "GEN.32.28"),
  pair("Solomon", "The temple", "1KI.6.14"),
  pair("Nehemiah", "Jerusalem's walls", "NEH.2.17"),
  pair("Zacchaeus", "Sycamore tree", "LUK.19.4"),
  pair("Peter", "Walked on water", "MAT.14.29"),
  pair("Thomas", "“My Lord and my God!”", "JHN.20.28"),
  pair("Lazarus", "Raised from the dead", "JHN.11.44"),
  pair("Saul of Tarsus", "Damascus road", "ACT.9.3"),
  pair("Stephen", "First martyr", "ACT.7.59"),
  pair("Mary", "Visited by Gabriel", "LUK.1.26"),
  pair("John the Baptist", "Locusts and wild honey", "MAT.3.4"),
  pair("Matthew", "Tax booth", "MAT.9.9"),
  pair("Nicodemus", "Came by night", "JHN.3.2"),
  pair("Gideon", "The fleece", "JDG.6.37"),
  pair("Hannah", "Prayed for a son", "1SA.1.20"),
  pair("Elisha", "Double portion", "2KI.2.9"),
  pair("Naaman", "Healed in the Jordan", "2KI.5.14"),
  pair("Balaam", "Talking donkey", "NUM.22.28"),
  pair("Rahab", "Scarlet cord", "JOS.2.18"),
];

export const TIMELINES: ReadonlyArray<TimelineItem> = [
  line("In the beginning", [["Creation", "GEN.1.1"], ["The flood", "GEN.7.17"], ["Tower of Babel", "GEN.11.9"], ["God calls Abram", "GEN.12.1"]]),
  line("The patriarchs", [["Isaac is born", "GEN.21.3"], ["Jacob is renamed Israel", "GEN.32.28"], ["Joseph is sold by his brothers", "GEN.37.28"], ["Joseph rules in Egypt", "GEN.41.41"]]),
  line("Out of Egypt", [["The burning bush", "EXO.3.2"], ["The first Passover", "EXO.12.13"], ["Crossing the Red Sea", "EXO.14.22"], ["The Ten Commandments", "EXO.20.3"]]),
  line("Into the land", [["Moses dies on Mount Nebo", "DEU.34.5"], ["Crossing the Jordan", "JOS.3.17"], ["Jericho falls", "JOS.6.20"], ["The judges rise", "JDG.2.16"]]),
  line("The kingdom", [["Saul is anointed", "1SA.10.1"], ["David is anointed", "1SA.16.13"], ["David becomes king over Israel", "2SA.5.3"], ["Solomon builds the temple", "1KI.6.14"]]),
  line("Division and exile", [["The kingdom divides", "1KI.12.19"], ["Elijah on Mount Carmel", "1KI.18.20"], ["Israel falls to Assyria", "2KI.17.6"], ["Jerusalem is burned", "2KI.25.9"]]),
  line("Coming home", [["Cyrus lets the exiles return", "EZR.1.1"], ["The temple is rebuilt", "EZR.6.15"], ["Esther becomes queen", "EST.2.17"], ["Nehemiah finishes the wall", "NEH.6.15"]]),
  line("The life of Jesus", [["Born in Bethlehem", "LUK.2.7"], ["Baptized by John", "MAT.3.16"], ["The Sermon on the Mount", "MAT.5.1"], ["Entering Jerusalem", "MAT.21.9"]]),
  line("Holy Week", [["The Last Supper", "LUK.22.19"], ["Praying in Gethsemane", "LUK.22.42"], ["The crucifixion", "LUK.23.33"], ["The empty tomb", "LUK.24.6"]]),
  line("The early church", [["Jesus ascends", "ACT.1.9"], ["Pentecost", "ACT.2.4"], ["Stephen is martyred", "ACT.7.59"], ["Saul meets Jesus", "ACT.9.3"]]),
  line("Paul's road to Rome", [["Arrested in Jerusalem", "ACT.21.33"], ["Appeals to Caesar", "ACT.25.11"], ["Shipwrecked", "ACT.27.41"], ["Arrives in Rome", "ACT.28.16"]]),
  line("Signs in John's Gospel", [["Water into wine", "JHN.2.9"], ["Feeding the five thousand", "JHN.6.11"], ["Healing the man born blind", "JHN.9.7"], ["Raising Lazarus", "JHN.11.44"]]),
];

export const BANK: ReadonlyArray<BankItem> = [...TRIVIA, ...WHO_SAID, ...PAIRS, ...TIMELINES];
