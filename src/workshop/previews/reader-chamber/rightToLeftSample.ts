import {
  HarnessGenerationController,
  findStory,
  type HarnessGenerationModelAdapter,
  type HarnessSkillManifest,
  type HarnessWorkspaceState,
} from '@seihouse/sen/harness-generation';
import { createLibraryMediaPort } from '@seihouse/library/media';
import { LIBRARY_BASE_MEDIA } from '../../../host/media/libraryCatalog';
import { REPLAY_MODEL, createMemoryStories, storyWithChapters } from './sampleStory';

/**
 * The workspace's right-to-left story: Sundered Heavens begun again in
 * Arabic, so right-to-left reading is checked on a real chapter. Its two
 * chapters were written for this workspace as the chapter loop writes one: a
 * plan in Arabic, then a Generated Chapter in the tiny SEN language (sound and
 * speaker tags), committed through the HARNESS exactly as the planner's and
 * the writer's replies are, so their Sound Cues and speakers are placed on
 * Arabic words, and their record kept, by the same code. They mix in what a
 * right-to-left reader meets in a real chapter: numbers (المنجم رقم 7, 40
 * جين) and System lines with Latin text ([… Lv. 1 / 9]).
 */
export const RIGHT_TO_LEFT_STORY_TITLE = 'السماوات الممزقة';

const MC_LOOK = { summary: 'شابٌّ نحيل بشعرٍ أسود يشدّه سلكٌ نحاسي وعينين رماديتين.', build: 'نحيل', hair: 'أسود يشدّه سلكٌ نحاسي', eyes: 'رماديتان', marks: 'ندوبٌ فضية باهتة على ساعديه' };

/** Each chapter's plan, as the planner returns it: in the story's language, every choice from its menu. */
export const RIGHT_TO_LEFT_PLANS: readonly Record<string, unknown>[] = [
  {
    cast: [
      { name: 'MC', kind: 'character', gender: 'male', age: 'adult', look: MC_LOOK, alreadyHas: [{ kind: 'thing', name: 'سلك نحاسي' }, { kind: 'thing', name: 'معول حديدي' }] },
      { name: 'سونغ شياوتيان', kind: 'character', who: 'رفيق غو تشن في المنجم، عاملٌ ضخم في المرحلة الثامنة من تكثيف التشي.', gender: 'male', age: 'adult',
        look: { summary: 'عاملٌ ضخم لوّحته الشمس.', build: 'ضخم', skin: 'برونزيّ لوّحته الشمس' } },
      { name: 'المشرف لو', kind: 'character', who: 'مشرفٌ فاسد من طائفة الكركي الحديدي.', gender: 'male', age: 'adult',
        look: { summary: 'رجلٌ بوجه ابن عرس وشاربٍ رفيع، في رداءٍ رمادي ودرعٍ مطليّة.', face: 'وجه ابن عرس وشاربٌ رفيع', clothing: 'رداءٌ رمادي ودرعٌ مطليّة' } },
    ],
    events: [
      { kind: 'confrontation', actor: 'المشرف لو', targets: ['MC', 'سونغ شياوتيان'], attempt: 'اتهامهما بسرقة حصّة الخام', outcome: 'partial', presses: [{ who: 'MC', level: 'light' }],
        how: 'يجثو غو تشن عند المنجم رقم 7، السلك النحاسي في شعره والمعول بين حذاءيه، حين يحاصره المشرف لو وسونغ شياوتيان بسبب حصّةٍ ناقصة بمقدار 40 جين ويهدّدهما بالتعليق عند البوابة الشمالية.',
        facts: [
          { type: 'holding', who: 'MC', change: 'equips', what: 'سلك نحاسي' },
          { type: 'holding', who: 'MC', change: 'equips', what: 'معول حديدي' },
          { type: 'stance', who: 'المشرف لو', towardWhom: 'MC', mode: 'said', polarity: 'hostile' },
        ] },
      { kind: 'discovery', actor: 'MC', targets: [], presses: [{ who: 'المشرف لو', level: 'heavy' }],
        how: 'يدقّ جرس الإنذار وينشقّ المنجم التاسع عن ضوء الفراغ؛ يفرّ الجميع، ويرى غو تشن سطور سلالة الصدع السماوي أمام عينيه.', facts: [] },
      { kind: 'decision', actor: 'MC', targets: [], presses: [{ who: 'MC', level: 'heavy' }],
        how: 'يخطو غو تشن نحو الضوء والمعول في يده بينما يفرّ الآخرون، حتى تلامس أصابعه حافة الشقّ.', facts: [] },
    ],
    arcGoalReached: { reached: false },
    chapterFunction: 'conflict',
  },
  {
    cast: [{ name: 'MC', kind: 'character' }, { name: 'سونغ شياوتيان', kind: 'character' }, { name: 'المشرف لو', kind: 'character' }, { name: 'معول حديدي', kind: 'thing' }],
    events: [
      { kind: 'training', actor: 'MC', targets: [], attempt: 'الإمساك بخيط الفراغ الفضي', outcome: 'success at a cost', presses: [{ who: 'MC', level: 'crushing' }],
        how: 'داخل الشقّ يُمسك غو تشن خيطًا فضيًا رغم الألم، فيُفلت معوله ويطفو بعيدًا، وتتشقّق عظامه وتصلب حتى تستيقظ سلالة الصدع السماوي.',
        facts: [
          { type: 'holding', who: 'MC', change: 'unequips', what: 'معول حديدي' },
          { type: 'holding', who: 'MC', change: 'learns', what: 'سلالة الصدع السماوي', level: 'Lv. 1' },
        ] },
      { kind: 'journey', actor: 'MC', targets: ['سونغ شياوتيان'], presses: [],
        how: 'يستيقظ غو تشن على أرض المنجم التاسع بعد ساعتين، وقد ظلّ سونغ شياوتيان يحفر بيديه بحثًا عنه.', facts: [] },
      { kind: 'confrontation', actor: 'المشرف لو', targets: ['MC', 'سونغ شياوتيان'], attempt: 'دفنهما في المنجم ليخفي الانهيار', presses: [{ who: 'سونغ شياوتيان', level: 'heavy' }],
        how: 'يسدّ المشرف لو الطريق بسيفٍ مسلول؛ ويلتقط غو تشن معوله من بين الحجارة، وقد صار يرى كل ارتعاشةٍ في معصم الرجل.',
        facts: [
          { type: 'holding', who: 'MC', change: 'equips', what: 'معول حديدي' },
          { type: 'goal', who: 'المشرف لو', change: 'set', what: 'دفن الشاهدين وإخفاء الانهيار' },
        ] },
    ],
    arcGoalReached: { reached: false },
    chapterFunction: 'progression',
  },
];

/** The Generated Chapters, as the writer returns them. */
export const RIGHT_TO_LEFT_REPLIES: readonly Record<string, unknown>[] = [
  {
    title: 'الصدأ والشقوق',
    paragraphs: [
      'مرّت تسعة آلاف سنة منذ أن تصدّعت قبة السماء القديمة كما يتصدّع الخزف، ومع ذلك لم يجد أحدٌ في وادي عِرق الصدأ وقتًا ليبكي على النجوم الساقطة. هنا، في البطن المسنّن للحافة الخارجية، لم يكن الرجال يصلّون للسماوات العليا؛ كانوا يلعنون الصخر الهشّ ويملؤون رئاتهم بغبار الكبريت.',
      'جثا غو تشن عند الحافة الضيقة للمنجم رقم 7، يتنفّس ببطء وهدوء حتى لا يثير المسحوق الأحمر العالق بياقته. كان سلكٌ نحاسيٌّ قاسٍ يشدّ شعره الأسود بعيدًا عن عينيه الرماديتين، وكُمّاه مثبّتان فوق ساعدين خشنين تعبرهما ندوبٌ فضية باهتة.',
      'استقرّ معوله الحديدي ذو الشعبتين بين حذاءيه، وقد أكلت منه ثلاثة مواسم من نحت الصخر المتحجّر. وتحته لم يكن الظلام مجرّد غياب للضوء؛ كان له ثِقل، ورائحةُ صقيعٍ قديم ونحاسٍ محترق كلما احتكّ ضباب الفراغ بالحواجز الخارجية للوادي.',
      '[[@سونغ شياوتيان]] «هذه سبعة أيام بلا رغيف دخنٍ كامل»، تنهّد سونغ شياوتيان وهو يُنزل سلّته بثقلٍ حتى [[sound: rattle | تدحرجت الحصى السائبة على الحافة | low]] في رذاذٍ جاف. «الدانتيان عندي كبركةٍ جفّت يا أخي غو. إن لم أدوّر طاقة الأرض الليلة، فقد أتراجع عن المرحلة الثامنة من تكثيف التشي.»',
      '[[@MC]] «اخفض صوتك»، قال غو تشن دون أن يرفع عينيه عن الشقّ. «الصخر هنا يسمع أكثر مما ينبغي. منذ الفجر وهو يئنّ كأن شيئًا تحته يتمدّد ويبحث عن مخرج.»',
      'مدّ يده ولمس الجدار. كانت العروق الحمراء في الحجر دافئة على غير عادتها، تنبض نبضًا خافتًا كقلبٍ نائم. لم يكن ذلك دفء خامٍ غنيّ ينتظر المعاول؛ كان دفء جرحٍ قديم لم يلتئم قطّ، جرحٍ يتذكّر اليوم الذي انشقّت فيه السماء.',
      '[[sound: metal scrape | احتكّت أحذية حديدية بالصخر الأردوازي | medium]] حين انعطفت ثلاثة ظلال عند زاوية النفق، يرتدون أردية رمادية كالرماد ودروعًا مطليّة لمراقبي طائفة الكركي الحديدي. وفي مقدّمتهم سار المشرف لو، رجلٌ بوجه ابن عرس وشاربٍ رفيع يرتجف بخبثٍ معتاد.',
      '[[@المشرف لو]] «انظروا من يختبئ في المنجم السابع»، قال لو وهو يقلّب دفترًا من ألواح الخيزران. «حصّتكما ناقصة بمقدار 40 جين من الخام هذا الشهر. أتعرفان ما يحدث للعمّال الذين يسرقون من الطائفة؟ نعلّقهم عند البوابة الشمالية حتى يتذكّر الجميع.»',
      '[[@MC]] «لم نسرق شيئًا»، أجاب غو تشن بهدوء. «النفق التاسع انهار الأسبوع الماضي، والخام الذي تطلبه مدفونٌ تحت ثلاثين قدمًا من الحجر. أنت تعرف ذلك جيدًا، فقد أمرتَ بإغلاقه بنفسك حتى لا يصل الخبر إلى الشيوخ.»',
      'احمرّ وجه لو، واقترب الحارسان خطوة. شدّ سونغ شياوتيان قبضته على حبل سلّته، لكن غو تشن ظلّ جاثيًا، يراقب الشقّ في الجدار وهو يتّسع بمقدار شعرة، ثم شعرة أخرى، ثم ثالثة، كأن الجبل يفتح عينه ببطء.',
      'ثم [[sound: bell rings | دقّ جرس الإنذار في أعلى الوادي | high]] ثلاث دقّات متتالية، حادّة ومذعورة. لم يكن موعد تغيير النوبة. كان ذلك الجرس يُقرع مرة واحدة كل عقد، حين يخترق ضباب الفراغ الحواجز ويبتلع ما يجده في طريقه.',
      'تشقّق السقف. انهمر الغبار الأحمر كالمطر، ومن عمق المنجم التاسع انبعث ضوءٌ بنفسجي باهت، يتلوّى كجرحٍ في نسيج العالم نفسه. صرخ أحد الحارسين وأسقط رمحه، وتراجع لو خطوتين وهو يضمّ دفتره إلى صدره كأنه درع يحميه من السماء.',
      '[[@سونغ شياوتيان]] «يا أخي غو، علينا أن نركض الآن! الحواجز سقطت!»',
      'لكن غو تشن لم يركض. شعر بشيءٍ في دمه يجيب ذلك الضوء، نداءً قديمًا لا اسم له، كأن الشقّ في السماء والشقّ في الصخر والشقّ في عظامه كانت كلها جرحًا واحدًا ينتظر من يلمسه منذ آلاف السنين.',
      'ظهرت أمام عينيه سطورٌ باهتة من نور، معلّقة في الهواء كأنها مكتوبة على الغبار: [تنبيه: سلالة الصدع السماوي — Lv. 0 / 9]. رمش مرة، ثم مرتين، فلم تختفِ.',
      'نهض ببطء، والمعول في يده، وخطا نحو الضوء بينما كان الجميع يفرّون منه. خلفه، كان صوت سونغ شياوتيان يتلاشى في هدير الصخر المنهار، وأمامه كان العالم ينشقّ ليكشف ما خبّأته السماء طوال تسعة آلاف عام.',
      'وحين لامست أصابعه حافة الضوء، لم يشعر بالخوف. شعر، لأول مرة منذ دخل هذا الوادي طفلًا يتيمًا، أنه عاد إلى بيتٍ لم يره من قبل.',
    ],
    recap: 'حاصر المشرف لو غو تشن وسونغ شياوتيان في المنجم السابع بسبب حصّة خام ناقصة، حتى دقّ جرس الإنذار وانشقّ المنجم التاسع عن ضوء الفراغ. فرّ الجميع، أما غو تشن فرأى سطور سلالة الصدع السماوي أمام عينيه وخطا نحو الضوء.',
    nextProgression: 'يدخل غو تشن الشقّ ويوقظ المرحلة الأولى من سلالة الصدع السماوي.',
    nextWorldBuilding: 'ما يكمن خلف الشقّ، ولماذا تخفي طائفة الكركي الحديدي انهيارات المناجم.',
    nextConflict: 'المشرف لو يحاول دفن غو تشن وسونغ شياوتيان في المنجم ليخفي جبنه.',
  },
  {
    title: 'تقسية عظم الصدع',
    paragraphs: [
      'لم يكن الضوء حارًّا كما ظنّ. حين دخل غو تشن الشقّ، شعر كأنه غاص في ماءٍ شتويّ، بارد إلى حدّ أن أفكاره تجمّدت للحظة، ثم بدأت تذوب ببطء، واحدةً تلو الأخرى، كجليدٍ يلامسه أول شعاع من الربيع.',
      'حوله، كان المنجم التاسع قد اختفى. لم تبقَ جدران ولا سقف، بل فضاءٌ بنفسجي تطفو فيه شظايا صخرٍ كجزرٍ صغيرة، وتتلألأ بينها خيوطٌ فضية كأنها أوتار قيثارة عملاقة لم يعزف عليها أحد منذ زمن بعيد.',
      '[[sound: chime | رنّت الخيوط الفضية رنينًا خافتًا | low]] حين اقترب منها، وكل رنّة كانت تلمس شيئًا عميقًا في صدره. ظهرت السطور مرة أخرى أمام عينيه، أوضح هذه المرة: [سلالة الصدع السماوي: الاستيقاظ 12%].',
      '[[@MC]] «إذن هذا ما كان ينادي»، همس لنفسه. «ليس الخام، ولا الكنز الذي يحلم به الشيوخ. شيءٌ يعرف اسمي قبل أن أعرفه أنا.»',
      'مدّ يده إلى أقرب خيط. كان الألم فوريًا وحادًّا، كأن أحدهم سكب معدنًا منصهرًا في عروقه. سقط على ركبتيه، وانزلق المعول الحديدي من يده وطفا بعيدًا في الفراغ البنفسجي.',
      'لكنه لم يُفلت الخيط. عضّ على أسنانه حتى سال الدم من شفته، وترك النار تسري في ذراعه، ثم في كتفه، ثم في عموده الفقري. كانت عظامه تتشقّق من الداخل، وفي كل شقٍّ كان شيءٌ جديد ينمو، أصلب من الحديد وأخفّ من الضوء.',
      '[[sound: power up | انفجرت الطاقة في عظامه دفعةً واحدة | high]]، وارتجّ الفضاء البنفسجي كله كسطح بحيرةٍ ضربها حجر. تحوّلت الندوب الفضية على ساعديه إلى خطوطٍ متوهّجة، ثم خبت ببطء حتى عادت ندوبًا عادية، لكنها كانت الآن دافئة كجمرٍ تحت الرماد.',
      '[تنبيه: سلالة الصدع السماوي — Lv. 1 / 9. تقسية العظم: المرحلة الأولى]',
      'حين فتح عينيه، كان مستلقيًا على أرض المنجم التاسع، والشقّ قد انغلق خلفه كأنه لم يكن. كان الغبار الأحمر ما يزال يتساقط من السقف، لكن ببطءٍ أكبر الآن، كأن الجبل نفسه يلتقط أنفاسه بعد معركة طويلة.',
      '[[@سونغ شياوتيان]] «غو تشن! أنت حيّ!» جاء الصوت من فوق كومة الحجارة، وظهر وجه سونغ شياوتيان المغطّى بالغبار، وعيناه واسعتان كقمرين. «ظننتُ أن الفراغ ابتلعك! لقد مرّت ساعتان كاملتان وأنا أحفر بيديّ!»',
      '[[@MC]] «ساعتان؟» نهض غو تشن ونفض الغبار عن كتفيه. شعر بجسده خفيفًا على نحوٍ غريب، كأن الجاذبية نسيت نصفه في ذلك الفضاء. «بدا لي أنها دقيقة واحدة لا أكثر.»',
      'لكن قبل أن يجيب سونغ، [[sound: metal scrape | احتكّ نصلٌ بغمده في الظلام | medium]] خلفهما. تقدّم المشرف لو من بين الأنقاض، وسيفه القصير يلمع في الضوء الخافت، ووجهه شاحب من الخوف والغضب معًا.',
      '[[@المشرف لو]] «لا أحد يخرج من هذا المنجم»، قال بصوتٍ مرتجف. «الطائفة ستسأل عن الانهيار، ولن أكون أنا من يدفع الثمن. حادثٌ مؤسف: عاملان دُفنا تحت الصخر. هذا كل ما سيُكتب في السجلّ.»',
      'نظر غو تشن إلى السيف، ثم إلى عيني لو. قبل ساعتين كان سيرى في ذلك النصل موته المحتوم. الآن، كان يرى كل ارتعاشةٍ في معصم الرجل، وكل خطأ في وقفته، وكل نفسٍ يأخذه قبل أن يهجم.',
      '[[sound: bell rings | دقّ الجرس مرة أخرى في البعيد | low]]، خافتًا هذه المرة، كأنه يعدّ الثواني الباقية. ابتسم غو تشن ابتسامةً صغيرة، وانحنى ليلتقط معوله الحديدي من بين الحجارة، وكان المعول أخفّ في يده من أي وقت مضى.',
      '[[@MC]] «أيها المشرف»، قال بهدوء، «أظنّ أن السجلّ سيحتاج إلى سطرٍ مختلف الليلة.»',
    ],
    recap: 'دخل غو تشن الشقّ وأيقظ المرحلة الأولى من سلالة الصدع السماوي، فصارت عظامه أصلب من الحديد. عاد إلى المنجم بعد ساعتين ليجد سونغ شياوتيان يحفر بحثًا عنه، والمشرف لو يسدّ الطريق بسيفٍ مسلول ليدفنهما ويخفي الانهيار.',
    nextProgression: 'يواجه غو تشن المشرف لو بجسده الجديد لأول مرة.',
    nextWorldBuilding: 'سجلّات طائفة الكركي الحديدي، ومن يقرؤها في القمة.',
    nextConflict: 'المشرف لو لا يستطيع أن يدع شاهدَين يخرجان من المنجم.',
  },
];

/** The planner and writer for the right-to-left story: they return these plans and replies, calling no model. */
function rightToLeftWriter(): HarnessGenerationModelAdapter {
  const receipt = () => ({ provider: 'workshop-replay', model: REPLAY_MODEL, generatedAt: new Date().toISOString(), durationMs: 0, usage: { source: 'unavailable' as const } });
  return {
    getServerInfo: async () => ({
      provider: 'workshop-replay',
      configured: true,
      models: [{ id: REPLAY_MODEL, label: 'Saved chapters (no model call)' }],
      defaultModel: REPLAY_MODEL,
    }),
    planChapter: async request => {
      const plan = RIGHT_TO_LEFT_PLANS[request.immediateChapterRequest.chapterNumber - 1];
      if (!plan) throw new Error('The right-to-left story has two chapters to replay.');
      return { rawProviderResponse: JSON.stringify(plan), providerReceipt: receipt() };
    },
    generate: async request => {
      const reply = RIGHT_TO_LEFT_REPLIES[request.immediateChapterRequest.chapterNumber - 1];
      if (!reply) throw new Error('The right-to-left story has two chapters to replay.');
      return { rawProviderResponse: JSON.stringify(reply), providerReceipt: receipt() };
    },
    arcOperation: async () => {
      throw new Error('The Workshop replays saved chapters only; it plans no arcs.');
    },
  };
}

/**
 * Sundered Heavens before its first chapter, its language set to Arabic, with
 * both chapters written through the HARNESS. The story's foundation, arc and
 * media are the sample's own.
 */
export async function buildRightToLeftStory(sample: HarnessWorkspaceState, skills: HarnessSkillManifest[]): Promise<HarnessWorkspaceState> {
  const storyId = sample.stories[0].id;
  const start = storyWithChapters(sample, storyId, 0);
  const story = findStory(start, storyId)!;
  story.title = RIGHT_TO_LEFT_STORY_TITLE;
  story.originalLanguage = 'ar';
  const repository = createMemoryStories(start);
  const controller = new HarnessGenerationController({
    repository,
    modelAdapter: rightToLeftWriter(),
    media: createLibraryMediaPort({ registered: [], entitlements: [], base: LIBRARY_BASE_MEDIA }),
  });
  controller.setInstalledSkills(skills);
  await controller.hydrate();
  for (let chapter = 0; chapter < RIGHT_TO_LEFT_REPLIES.length; chapter += 1) await controller.writeNextChapter(storyId, REPLAY_MODEL);
  return repository.load();
}
