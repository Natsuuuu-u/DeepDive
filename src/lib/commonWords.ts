/**
 * High-frequency English words plus common look-alikes of trivia answers.
 *
 * A typo that lands on a real word ("while" for "whale", "child" for "Chile")
 * is not a high-confidence spelling mistake: the player may have meant the
 * word they typed. These words are never accepted automatically; at most they
 * produce a "Did you mean...?" prompt the player must confirm.
 */
export const COMMON_WORDS: ReadonlySet<string> = new Set(
  `
  a an the of and or but if then than that this these those there their they them him her his hers its it
  is are was were be been being am do does did done have has had having will would can could should may
  might must shall not no nor so as at by for from in into on onto to up upon with within without over
  under about above below between among through during before after again further once here where when why
  how all any both each few more most other some such only own same too very just also even still yet ever
  never always often sometimes usually already almost enough less least many much neither either every
  go goes going went gone come comes coming came get gets getting got give gives giving gave take takes taking
  took make makes making made say says saying said see sees seeing saw seen know knows knowing knew known think
  thinks thinking thought want wants wanting wanted use uses using used find finds finding found tell tells
  telling told ask asks asking asked work works working worked seem seems seeming seemed feel feels feeling felt
  try tries trying tried leave leaves leaving left call calls calling called keep keeps keeping kept let lets
  letting begin begins beginning began begun show shows showing showed shown hear hears hearing heard play plays
  playing played run runs running ran move moves moving moved live lives living lived believe believes believing
  believed bring brings bringing brought happen happens happening happened write writes writing wrote written sit
  sits sitting sat stand stands standing stood lose loses losing lost pay pays paying paid meet meets meeting met
  include includes including included continue continues continuing continued set sets setting learn learns
  learning learned change changes changing changed lead leads leading led understand understands understanding
  understood watch watches watching watched follow follows following followed stop stops stopping stopped create
  creates creating created speak speaks speaking spoke spoken read reads reading remember remembers remembering
  remembered hold holds holding held turn turns turning turned start starts starting started become becomes
  becoming became grow grows growing grew grown open opens opening opened walk walks walking walked win wins
  winning won offer offers offering offered remember forget forgot forgotten buy buys buying bought sell sells
  selling sold send sends sending sent build builds building built stay stays staying stayed fall falls falling
  fell fallen cut cuts cutting hit hits hitting put puts putting mean means meaning meant keep kept sleep sleeps
  sleeping slept eat eats eating ate eaten drink drinks drinking drank drunk drive drives driving drove driven
  fly flies flying flew flown swim swims swimming swam swum

  time year people way day man woman child boy girl world life hand part place case week company system program
  question number night point home room mother area money story fact month lot right study book eye job word
  business issue side kind head house service friend father power hour game line end member law car city
  community name president team minute idea kid body information back parent face level office door health
  person art war history party result change morning reason research moment air teacher force education foot age
  policy process music market sense nation plan college interest death experience effect class control care field
  development role effort rate heart drug leader light voice wife police mind price report decision son daughter
  view relationship town road arm difference value building action model season society tax director position
  player record paper space ground form event official matter center couple site project activity star table need
  court oil situation cost industry figure street image phone data picture practice piece land product doctor
  wall patient worker news test movie north south east west evidence customer step manager income option
  solution front hope agency chapter resource audience museum language country city island river lake mountain
  valley forest desert beach tree flower grass animal bird fish insect plant fruit vegetable grain bread rice
  milk cheese butter sugar salt pepper honey coffee tea wine beer juice drink food meal dinner lunch breakfast
  kitchen bedroom bathroom garden school library hospital church castle bridge tower palace temple museum city
  farm field road street village town state border ocean sea water air fire earth stone rock sand mud ice snow
  rain hail wind storm cloud sun moon star planet space sky night day light dark sound noise music song dance
  film book story poem paint sculpture photo video computer phone screen keyboard mouse internet website

  good new first last long great little old big high different small large next early young important public
  bad same able best better cheap clean clear close cold cool dark dead deep easy fair fast fine free full
  funny happy hard heavy hot huge human kind late local low main major mean modern natural near neat nice open
  patient perfect plain poor popular pretty quick quiet rare real red rich rough round sad safe scary secret
  serious sharp short shy sick simple slow smart soft solid sorry special strong stupid sure sweet tall thick
  thin tidy tiny tough true ugly warm weak wet wide wild wise wrong yellow

  whale while whole wheel wale shale share sharp shard shave shake shape shark squad squib squid coral corral
  moral mural angel angle ankle otter utter outer letter litter matter batter better bitter butter water wafer
  waver wader waste porter poster foster oyster roster sealer dealer healer steal steel still spill spill brain
  drain grain train plane plain planet plant plans plate bloom blood flood brood broad breed breeze freeze peach
  peace reach teach bench bunch lunch punch hutch hatch match patch pitch pinch catch ratchet chatter catcher
  pitcher patcher

  horse house mouse moose goose sheep sheet fleet meat meet seat seed seek seem seen sent cent rent bent dent
  tent lent went want wand ward word worm warm warn barn born burn horn cord card core cure pure lure fire fine
  find fond fund

  apple apply ample amble maple table cable sable fable grape grade grand grant grunt lemon melon felon mango
  mangle mange berry ferry merry cherry tiger timer tiler tamer tumor tutor snake snack stake steak stale scale
  eagle eager panda panel penal koala zebra libra camel cameo llama drama hippo rhino sloth cloth lemur femur
  gecko skunk stunk beaver beater rabbit habit falcon sparrow narrow arrow robin finch raven crow crown brown
  swan duck heron crane stork owl mice nice deer dear peer seal sale crab grab clam mussel muscle shrimp lobster
  mobster jellyfish starfish seahorse manatee narwhal beluga porpoise purpose orca dolphin octopus nautilus
  cuttlefish cattle viper piper cobra python lizard wizard toad load frog from newt salamander axolotl caecilian

  chile child chime chine china chain india indie indigo spain spawn stain slain japan jaunt jordan garden
  israel iran iron iraq mali male mail chad chat chart niger nicer nigeria ghana gonna kenya cuba cube pure peru
  fiji laos togo tonga tango samoa qatar oman woman yemen syria libya malta nepal bhutan brunei latvia serbia
  venus venue mars miner minor satin saturn

  one two three four five six seven eight nine ten eleven twelve twenty thirty forty fifty hundred thousand
  million billion first second third fourth fifth last next
  `
    .split(/\s+/)
    .filter(Boolean),
)
