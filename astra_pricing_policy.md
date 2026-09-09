# NativeLingo Pricing & Go-to-Market Advisory

## Executive recommendation

**Sell NativeLingo as a faster Windows workflow—not as access to an AI model.**

Your strongest commercial proposition is:

> **Translate, understand, and rewrite text in the Windows apps you already use—without switching tabs or copying everything into a chatbot.**

BYOK and local models support that proposition through flexibility and control. They should not become the main explanation of why someone should buy.

### Recommended launch policy

| Decision | Recommendation |
|---|---|
| Primary monetization model | **14-day, no-card reverse trial**, followed by a permanently useful free edition |
| Free edition | Unlimited basic translation through the user’s model, one hotkey, HUD preview and manual copy |
| Pro monthly | **$8/month** |
| Pro annual | **$69/year** — equivalent to $5.75/month |
| Perpetual license | **$149 one-time**, including 12 months of updates; not “all future versions forever” |
| Optional perpetual update renewal | **$49 for another 12 months of updates and standard support** |
| Team | **$12/user/month or $99/user/year**, minimum three seats—only once team administration exists |
| Enterprise | **From $150/user/year, 25-seat minimum**, subject to an explicitly defined scope |
| Launch promotion | First 200 perpetual licenses at **$119**, with the same update terms |
| Refunds | **14 days after initial purchase**, subject to any stronger statutory rights |
| Personal device allowance | Two activated Windows devices, for one named user |
| Core paid differentiation | Auto paste-back, three hotkey slots, workflow presets, advanced explanation, customization |
| Free-model access | Allow both BYOK and local-model connections; do not charge a separate “bring your own model” fee |
| Initial target market | Multilingual support/CX professionals at small and midsize businesses |
| First acquisition focus | Demonstration-led content, workflow templates, targeted communities and small creator partnerships |

**Important:** These are recommended launch hypotheses, not measured willingness-to-pay results. All conversion, churn and financial figures below are planning assumptions unless explicitly described as arithmetic.

---

# 1. Strategic foundations: what NativeLingo should monetize

## 1.1 The customer is paying for workflow leverage

A user might reasonably ask:

> “If I supply the model and pay the API bill, why am I paying you?”

The answer must be clear:

> “Your model generates the text. NativeLingo makes that model useful throughout your working day.”

The paid value includes:

- Invoking the right action without changing applications.
- Avoiding repetitive copy-paste.
- Keeping different workflows on predictable hotkeys.
- Applying role-specific instructions without rewriting prompts.
- Understanding nuance, jargon and tone in context.
- Returning usable text to the active application.
- Managing the desktop interaction safely and reliably.

This is analogous to paying for an email client while already paying for email hosting, or buying a database tool while supplying your own database.

**Do not price primarily by words, tokens or transformations when you are not paying the inference bill.** That creates a mismatch between the price metric and your actual value.

## 1.2 Zero inference cost is an advantage—not zero cost of service

NativeLingo still has costs:

- Payment processing or merchant-of-record fees.
- Refunds, fraud and chargebacks.
- Customer support.
- Windows compatibility work.
- Model-provider API changes.
- Code signing.
- Distribution and update delivery.
- Crash reporting, licensing and account infrastructure.
- Security fixes.
- Local-model troubleshooting.
- Ongoing development.

The danger is replacing an inference bill with an uncontrolled support bill.

Your pricing and product boundaries should therefore optimize:

> **Revenue per supported workflow, not maximum installations at any cost.**

## 1.3 Choose one initial buyer

The three role packs are useful product capabilities. They should not become three equally weighted launch campaigns.

| Segment | Likely value | Main friction | Priority |
|---|---|---|---|
| Multilingual support/CX professionals | Frequent translation, tone adjustment, explanation and reply rewriting | Customer-data policies and API setup | **First** |
| Developers working across languages | Jargon, explanations, comments and technical communication | Strong substitutes; preference for free tools | Second |
| Executives and general business users | Better writing and comprehension | Low tolerance for BYOK setup | Later, unless onboarding becomes very simple |
| Local-AI/privacy enthusiasts | Provider choice and local processing | High customization and support expectations | Useful early-adopter channel |
| Students/general translation users | Broad reach | Lower willingness to pay and heavy free usage | Distribution, not primary monetization |

**Recommended initial positioning:**

> **Reply naturally across languages, directly inside your support tools.**

Use developers and privacy enthusiasts for feedback and distribution, but do not let them dictate all pricing decisions.

---

# 2. Monetization models: evaluation

## 2.1 Comparative assessment

| Model | Advantages | Risks for NativeLingo | Best use | Verdict |
|---|---|---|---|---|
| Traditional freemium | Low adoption friction; durable organic distribution | Users may never experience paid value; large unsupported free population | A tightly scoped free utility | Useful as the destination after a trial |
| Time-limited free trial, then hard stop | Clear purchase decision; limits ongoing free support | Users face Windows trust, model setup and payment friction before forming a habit | Mature utilities with strong purchase intent | Too restrictive for the initial product |
| **Reverse trial: Pro first, then Free** | Demonstrates the full workflow; preserves unpaid distribution; creates a concrete upgrade contrast | Requires clear downgrade behavior and disciplined feature boundaries | Workflow products whose value comes from repeated use | **Recommended** |
| Paid upfront with refund guarantee | Immediate cash; simple desktop-software positioning | Weak for an unfamiliar brand with BYOK setup friction | Later, once reputation and demonstrations are strong | Offer perpetual purchase, but not as the only entry point |
| Open-core | Transparency, community extensions and technical adoption | Requires a clear paid boundary; easy forks; substantial community maintenance | Developer infrastructure or ecosystem-led products | Not the default choice for this application |
| Lifetime deal | Fast cash and feedback | Long support liabilities; attracts bargain hunters; weak recurring economics | Small, tightly bounded launch cohort | Use a version/update-bounded perpetual offer instead |
| Usage-based pricing | Aligns revenue with activity when usage creates supplier cost | Feels like double charging when users supply inference | Future optional hosted service | Avoid for the current core product |

## 2.2 Why the reverse trial wins

NativeLingo’s paid advantage is partly experiential.

A screenshot does not fully communicate:

1. Highlight text.
2. Press a hotkey.
3. Apply a reliable transformation.
4. Return the result to the original application.
5. Continue working without changing context.

Users need to perform that loop several times before understanding its value.

A reverse trial allows them to experience:

- Three dedicated hotkeys.
- Auto paste-back.
- Role-specific workflows.
- Advanced explanations.
- Saved custom instructions.

After 14 days, the free edition remains useful, but repetitive workflows become less convenient.

That creates a legitimate conversion moment:

> “I can still use NativeLingo for basic translation, but I want the faster workflow back.”

That is much stronger than:

> “The application stopped working until I paid.”

---

## 2.3 The major freemium traps—and how to avoid them

These are not inevitable outcomes of freemium, but they are common failure modes for desktop utilities.

### Trap 1: Giving away the entire economic benefit

If Free includes unlimited translation, all hotkeys, automatic insertion, all role presets and advanced explanations, the remaining upgrade reasons are cosmetic.

**Avoidance:**

- Free provides the basic outcome.
- Pro provides automation, repeatability and professional depth.
- Keep the same underlying model choice and output quality.
- Do not deliberately make Free slow or inaccurate.

### Trap 2: Free users receive unlimited personal support

A free user with an unusual Ollama setup can consume more support time than a paying user generates in annual contribution.

**Avoidance:**

- Free: documentation, community help and bug reporting.
- Pro: standard email support for NativeLingo functionality.
- Team: priority business support.
- Enterprise: separately scoped onboarding and support terms.

Support should cover supported connections—not every possible GPU, model file, proxy, driver and custom endpoint.

### Trap 3: Counting installations instead of successful workflows

A download is not evidence of value.

A user may never:

- Finish installation.
- Trust the executable.
- Connect a model.
- Resolve a hotkey conflict.
- Produce an acceptable result.

**Avoidance:** Instrument the activation funnel, not just download counts.

### Trap 4: Making the model connection a homework assignment

“Paste your Gemini API key” is easy for a developer and confusing for many business users.

**Avoidance:** Offer guided connection, validation, plain-language errors and a clearly recommended path.

### Trap 5: Arbitrary quotas

“Five translations per day” is difficult to justify when the customer supplies the inference.

**Avoidance:** Charge for workflow features rather than artificial volume constraints.

A quota may make sense for a future founder-funded cloud service. It is a poor default for local or BYOK processing.

### Trap 6: Disruptive upgrade pressure

Do not inject:

- Watermarks into customer replies.
- Referral links into pasted text.
- Interrupting modals during urgent work.
- Marketing text into prompts.
- Unrequested changes to output.

**Avoidance:** Keep upgrade prompts inside NativeLingo’s own UI and trigger them at relevant feature boundaries.

### Trap 7: Treating free users as automatically viral

An in-place desktop assistant produces private work. Other people often do not see which tool generated the result.

**Avoidance:** Build explicit sharing loops around presets, recommendations and demonstrations—not customer content.

---

# 3. Recommended pricing architecture

## 3.1 Public pricing

All prices below are recommended USD list prices, before tax where tax-exclusive pricing is lawful. Local consumer pricing may need to display tax-inclusive totals.

| Plan | Price | Billing | Customer |
|---|---:|---|---|
| Free | $0 | None | Occasional basic translation |
| Pro Monthly | **$8** | Monthly, cancel anytime | Users validating ongoing value |
| Pro Annual | **$69** | Annual auto-renewal | Regular individual professionals |
| Pro Perpetual | **$149** | One-time | Subscription-averse desktop users |
| Perpetual update renewal | **$49** | Optional, nonautomatic by default | Existing perpetual owners wanting current releases |
| Team Monthly | **$12/seat/month** | Minimum three seats | Small teams needing centralized ownership |
| Team Annual | **$99/seat/year** | Minimum three seats | Established team deployments |
| Enterprise | **From $150/seat/year** | Minimum 25 seats; annual agreement | Managed deployments with defined controls |

### Why $8 monthly and $69 annually?

- $8 is an accessible professional utility price.
- $69 annual is meaningfully above impulse-purchase pricing.
- Annual billing reduces payment-fee drag.
- Annual prepayment improves cash flow.
- The annual discount is **28.1%** relative to twelve $8 payments.
- The effective annual monthly price is **$5.75**, but the page must clearly state **$69 billed annually**.

Do not assume lower prices automatically increase revenue. At this price level, trust, setup difficulty and demonstrated workflow value can be larger obstacles than a $1–$2 monthly difference.

### Why $149 perpetual?

It is approximately:

- **2.16 years** of annual subscription revenue.
- **18.6 months** of monthly subscription payments.

That is reasonable only because the perpetual license does **not** include unlimited future updates and support forever.

A $49 or $69 “lifetime everything” deal would be far less defensible.

---

## 3.2 Subscription versus perpetual: make the distinction precise

### Subscription includes

- Pro features in current releases.
- Updates while subscribed.
- Standard support while subscribed.
- Two activated personal devices.

### Perpetual includes

- Indefinite use of Pro functionality in eligible app releases.
- Eligibility for releases issued during the first 12 months after purchase.
- Standard support during that initial update period.
- Two activated personal devices.
- Optional purchase of another update period.

### After the perpetual update period ends

The customer may:

1. Keep using the last eligible version.
2. Buy another 12 months of updates for $49.
3. Move to a subscription if that becomes preferable.

**Do not silently install an incompatible new release and then remove already-purchased functionality.** The updater must understand license eligibility.

### Important limits

A perpetual application license cannot guarantee:

- A third-party API will exist forever.
- A particular voice service will remain available.
- Compatibility with all future Windows versions.
- Indefinite security maintenance for every historical release.

These limits belong in plain-language purchase terms—not only in legal fine print.

### Should the perpetual option be prominent?

Recommend this hierarchy:

1. Free.
2. Pro Annual, marked “Best value for ongoing updates.”
3. Pro Monthly.
4. A visible but secondary “Prefer a one-time purchase?” section.

Do not hide it. Also do not make it the only product anyone notices.

---

## 3.3 Feature packaging

The guiding principle:

> **Free delivers a useful result. Pro delivers a professional workflow. Team delivers organizational ownership and control.**

| Capability | Free | Pro | Team / Enterprise |
|---|---|---|---|
| Connect a supported Gemini API key | Yes | Yes | Yes |
| Connect supported Ollama / LM Studio setups | Yes | Yes | Yes |
| Basic selected-text translation | Unlimited through user’s model | Unlimited | Unlimited |
| Basic source/target language selection | Yes | Yes | Yes |
| Global hotkeys | **One** | **Three** | Three per user |
| HUD preview | Yes | Yes | Yes |
| Copy result manually | Yes | Yes | Yes |
| Automatic paste-back | — | **Yes** | Yes |
| Full rewriting and transformation workflows | Trial preview only | **Yes** | Yes |
| Jargon Explainer | Trial preview only | **Yes** | Yes |
| Structured tone, nuance and slang breakdown | Trial preview only | **Yes** | Yes |
| Support/CX, Developer and Executive packs | Preview/catalog | **All included** | Shared deployment where implemented |
| Save custom role instructions | — | **Yes, if implemented** | Shared templates where implemented |
| Preset import | One active basic-compatible preset | Full supported presets | Centrally managed where implemented |
| Preset export/share | Simple share link or file | Full workflow sharing | Shared library where implemented |
| Neural TTS | Preview if commercially permitted | Included only for supported, permitted providers | Policy-controlled where implemented |
| Central billing and seat reassignment | — | — | **Yes, once built** |
| Managed configuration / provider restrictions | — | — | Contracted features only |
| SSO, audit events, deployment packaging | — | — | Enterprise only if actually available |
| Support | Docs/community | Standard email | Priority or contractual scope |

### Three packaging cautions

**1. Do not sell roadmap features as available.**  
The current application capabilities do not automatically imply seat administration, SSO or managed deployment. Label these as planned until shipped.

**2. Keep advanced role packs bundled initially.**  
Selling a $9 developer pack, a $12 support pack and a separate jargon add-on creates unnecessary checkout complexity.

**3. Do not restrict privacy to expensive plans.**  
Local-model connections and a telemetry opt-out should not be enterprise-only benefits.

---

## 3.4 Team pricing needs genuine team value

Team is not simply “Pro multiplied by the number of employees.”

Before launching Team, implement at least:

- Organization-owned licenses.
- An administrator who can invite and remove users.
- Seat reassignment.
- Central billing.
- A documented deployment process.
- A clear policy for personal versus organizational API keys.

Then add:

- Shared role presets.
- Allowed-provider configuration.
- Organization-level defaults.
- Optional content-free operational reporting.

Do not centralize employees’ prompts or selected text merely to justify team pricing.

### Enterprise boundary

The $3,750 annual minimum—25 seats × $150—is a starting floor for a standard managed deployment, not a promise to build custom SSO or comply with every procurement requirement at that price.

Separately scope:

- Custom integrations.
- Dedicated onboarding.
- Security questionnaires requiring substantial work.
- Bespoke deployment requirements.
- Contractual service commitments.
- Source escrow.
- Special offline licensing arrangements.

If enterprise demand is not present, use “Contact sales” rather than building speculative administration features.

---

# 4. Pricing BYOK and local models without confusing customers

## 4.1 Lead with the workflow, disclose the model requirement early

Bad headline:

> BYOK/BYOM Electron desktop transformation layer.

Better headline:

> **Translate and rewrite directly inside your Windows apps.**

Supporting line:

> Connect your own supported AI service or use a compatible local model. NativeLingo charges for the desktop workflow—not per word.

The model requirement should be visible **before download and checkout**, not discovered after purchase.

## 4.2 Explain the two bills

Use a short pricing FAQ:

> **Does NativeLingo include AI usage?**  
> No. Your license pays for the NativeLingo desktop application. If you connect a cloud provider, that provider may charge you separately under its current terms. Compatible local models do not incur cloud inference charges, but require suitable hardware.

Also clarify:

- A consumer chatbot subscription may not include API usage.
- Provider free tiers can change.
- Rate limits are imposed by the connected provider.
- Local performance depends on hardware and model choice.
- NativeLingo is not reselling API capacity.

Never promise “free Gemini forever.”

## 4.3 Offer three onboarding paths

### Path A: “Connect a cloud model”

For most users who can obtain an API key.

The wizard should:

1. Explain what an API key is.
2. Link to the provider’s official setup.
3. Clarify API billing versus consumer subscriptions.
4. Accept and validate the key.
5. Run a small test.
6. Show the selected model.
7. Explain provider budget controls where available.
8. Start the interactive hotkey tutorial.

### Path B: “Use a model already running on this PC”

Detect supported local endpoints where practical.

Then:

- Test connectivity.
- List compatible detected models.
- Recommend a supported configuration.
- Explain likely speed limitations.
- Provide endpoint-specific troubleshooting.

Do not assume a nontechnical user wants to install a local-model stack just to evaluate a translation utility.

### Path C: “See the workflow first”

Provide an interactive product tour or a clearly labeled simulated demonstration.

This reduces uncertainty before API setup.

It must not be represented as a live local-model result if it is not one.

## 4.4 Do not introduce a hosted inference plan immediately

A future “AI included” plan may be valuable if model setup is the dominant activation blocker.

But it creates a different business:

- Usage costs.
- Abuse management.
- Privacy responsibilities.
- Provider selection.
- Quotas and billing.
- Model quality support.

Build it only after measuring onboarding drop-off and willingness to pay.

If introduced, keep the economics explicit:

> NativeLingo Pro + hosted usage allowance.

Do not bury unlimited cloud inference inside the existing $8 price without evidence that it is sustainable.

---

# 5. Trial and conversion mechanics

## 5.1 Trial policy

**Recommended: 14 days of Pro, no payment card.**

Start the trial after the first successful real transformation—not at download.

That avoids wasting the trial while a user:

- Installs Ollama.
- Waits for an API key.
- Resolves an endpoint issue.
- Deals with a hotkey conflict.

Recommended rules:

- One introductory trial per person.
- No automatic charge.
- Visible end date.
- Automatic downgrade to Free.
- Preserve preferences and presets after downgrade.
- Never delete the user’s configuration to force a purchase.
- Offer a support-issued extension when a verified product defect prevented evaluation.

Do not overinvest in stopping people from reinstalling for another trial. Your principal task is improving purchase intent, not building hostile DRM.

## 5.2 Activation definition

Define an activated user as someone who:

1. Connects a functioning model.
2. Completes at least three successful transformations.
3. Uses NativeLingo inside at least two real applications.
4. Uses a hotkey more than once.

Track first successful transformation separately. It is the first-value event, not the complete habit signal.

## 5.3 Conversion triggers

| Observed behavior | Relevant prompt |
|---|---|
| User repeatedly copies from the HUD | “Return results automatically with Pro paste-back.” |
| User frequently changes the action assigned to one hotkey | “Keep three workflows ready on separate hotkeys.” |
| User uses explanation heavily during trial | “Keep tone, jargon and nuance explanations with Pro.” |
| User revisits the Support pack | “Make your support workflow a one-key action.” |
| User works regularly across several apps | “Keep the same writing workflow across your workday.” |
| User shares a preset with colleagues | “Need licenses owned by your team?” |

Limit passive promotional prompts to roughly once per week, excluding:

- User-requested pricing screens.
- Explicit attempts to use a paid feature.
- Necessary trial or billing notices.

A paywall interaction should explain the exact feature being unlocked—not display a generic “Go premium” message.

## 5.4 Trial communication sequence

Email requires appropriate consent and compliance with applicable marketing rules. Essential product notices can also appear in-app.

| Timing | Purpose | Suggested message |
|---|---|---|
| First successful use | Confirm value | “Your first in-place transformation is ready.” |
| Day 1 | Build a repeated action | “Set your most-used workflow on a hotkey.” |
| Day 3 | Demonstrate segment value | “Try the Support reply preset in your actual inbox.” |
| Day 6 | Highlight professional differentiation | “Preview first—or paste back automatically when you choose.” |
| Day 10 | Show a factual usage summary | “You used NativeLingo for 38 transformations this week.” |
| Day 12 | Explain the upcoming change | “Your Pro trial ends in two days. Basic translation stays free.” |
| Day 14 | Downgrade respectfully | “You’re now on Free. Your settings are saved.” |
| Day 21 | One relevant reactivation prompt | “Want your three-hotkey workflow back?” |

Avoid fabricated productivity claims. If showing estimated time saved, identify the estimate and let users inspect its assumptions.

---

# 6. Marketing policy and acquisition loops

## 6.1 Homepage structure

### Hero

> **Translate and rewrite without leaving your Windows apps.**

### Supporting copy

> Select text in Slack, Outlook, Chrome, VS Code and other supported apps. Press a hotkey. Preview the result or return it directly to your work.

### Model disclosure

> Connect a supported cloud API key or compatible local model. Cloud-provider charges may apply.

### CTA

> **Download for Windows — 14 days of Pro, no card required**

Secondary CTA:

> Watch a 30-second workflow demo

### Proof section

Show the same task:

- Before NativeLingo: select, copy, switch, prompt, copy, switch, paste.
- With NativeLingo: select, hotkey, review or insert.

Do not rely on a large feature grid before users understand this contrast.

## 6.2 Be careful with performance claims

“Sub-700ms” is commercially useful only if its scope is clear.

Specify:

- Hardware.
- Model and provider.
- Input size.
- Network conditions.
- Whether the number measures first response, first token or completed transformation.
- Typical versus best-case performance.

Safer copy:

> Designed for fast in-place workflows. Response time varies by model, hardware, text length and connection.

Use quantified speed claims alongside a reproducible benchmark—not as a universal guarantee for local and cloud models.

---

## 6.3 Acquisition loop A: preset sharing

A user creates or chooses a useful workflow:

> “Rewrite a delayed-delivery response in warm, concise German.”

They share a preset link or file.

The recipient can:

1. View the preset safely.
2. Download NativeLingo.
3. Import the preset.
4. Try it during the reverse trial.
5. Buy Pro if it becomes part of daily work.

### Safety and implementation requirements

Presets must not include:

- API keys.
- Customer text.
- User history.
- Executable code.
- Silent network destinations.

Treat imported instructions as untrusted configuration. Show what the preset does before enabling it.

Free users should be able to import a basic-compatible preset. Advanced actions can remain trial/Pro features.

---

## 6.4 Acquisition loop B: coworker recommendation

After a user demonstrates repeat use—for example, 25 successful actions over at least a week—offer:

> “Working with someone who switches languages all day? Share NativeLingo.”

This is more natural than asking for referrals during installation.

For business use, add:

> “Send a team evaluation guide.”

That guide should cover:

- Windows requirements.
- Model setup.
- Data-flow explanation.
- Supported applications.
- Pricing.
- Pilot success criteria.

---

## 6.5 Acquisition loop C: workflow-specific search

Prioritize high-intent pages:

- Translate selected text in Outlook on Windows.
- Rewrite Zendesk replies without switching tabs.
- Explain developer jargon while reading Slack.
- Use a local model for selected-text rewriting.
- Windows global-hotkey translation assistant.

Each page should include:

- A real workflow video.
- Setup instructions.
- Known limitations.
- Model and privacy disclosure.
- A clear Windows download.
- An honest comparison with manual alternatives.

Avoid hundreds of interchangeable AI-generated SEO pages. A small library of tested workflows is more credible and easier to maintain.

---

## 6.6 Acquisition loop D: targeted creators

Prioritize creators serving:

- Customer-support professionals.
- Windows productivity users.
- Multilingual remote workers.
- Local-AI users.
- Developers collaborating internationally.

Give them:

- A working license.
- A short demo script.
- Accurate claims and limitations.
- A track