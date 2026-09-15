export type PublicLocale = 'zh' | 'en'

export type DeepReadonly<Value> = Value extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : Value extends object
    ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
    : Value

export interface PublicSection {
  title: string
  content: string
}

export interface PublicDocument {
  title: string
  lastUpdated: string
  intro?: string
  feedbackHint?: string
  sections: readonly PublicSection[]
}

export interface PublicFaqItem {
  question: string
  answer: string
}

export interface PublicFaq {
  title: string
  subtitle: string
  items: readonly PublicFaqItem[]
}

export interface PublicPageContent {
  faq: PublicFaq
  privacy: PublicDocument
  terms: PublicDocument
  contentPolicy: PublicDocument
}

export const PUBLIC_CONTENT: DeepReadonly<Record<PublicLocale, PublicPageContent>> = {
  "zh": {
    "faq": {
      "title": "常见问题解答",
      "subtitle": "查找有关 Cling AI 的常见问题的答案",
      "items": [
        {
          "answer": "打开“创建”，选择“图像”或“视频”，根据需要上传照片，编写提示，然后点击“生成”。生成完成后，您的结果将保存到配置文件中。",
          "question": "如何创建 AI 图像或视频？"
        },
        {
          "question": "Cling AI是什么？",
          "answer": "Cling AI是一个AI创作平台，您可以在其中创建AI图像和视频、将照片转换为视频、交换面孔以及探索即用型创意工具。"
        },
        {
          "question": "我如何赚取钻石？",
          "answer": "您可以通过每日签到、精选任务、邀请奖励、购买来赚取钻石。 VIP还包含每日免费图片/视频配额和每日钻石。"
        },
        {
          "question": "Cling AI可以免费使用吗？",
          "answer": "是的。您可以免费开始使用每日奖励和试用积分。更高产量的生成、更长的视频和高级功能可能需要钻石或 VIP。"
        },
        {
          "question": "我可以与他人分享我的创作吗？",
          "answer": "是的。您可以下载结果、共享邀请链接以及使用共享赚取入口点（如果可用）。某些生成的内容可能需要在公开展示之前进行审查。"
        },
        {
          "question": "Cling AI支持哪些语言？",
          "answer": "Cling AI支持英语、德语、日语、韩语、西班牙语、阿拉伯语、法语、葡萄牙语、印度尼西亚语、印地语、越南语、荷兰语、波兰语、土耳其语、意大利语、挪威语和菲律宾语。"
        },
        {
          "question": "如何举报不当内容？",
          "answer": "使用可用的报告按钮，或打开反馈并包含内容链接、生成 ID 和简短说明。我们的团队审查报告并应用内容政策。"
        },
        {
          "answer": "是的。您可以从“设置”请求删除帐户或联系支持人员。帐户删除是永久性的，可能会删除您的个人资料、创作和历史记录。",
          "question": "我可以删除我的帐户吗？"
        }
      ]
    },
    "privacy": {
      "title": "隐私政策",
      "lastUpdated": "最后更新：2024年12月30日",
      "sections": [
        {
          "title": "1. 我们收集的信息",
          "content": "我们收集您直接提供给我们的信息，包括：\n• 账户信息（邮箱、显示名称、头像）\n• 您在应用中创建的消息和内容\n• 支付信息（由第三方安全处理）\n• 设备信息和使用数据\n\n我们不会收集或存储：\n• 您的信用卡号码（由支付处理商处理）\n• 生物识别数据\n• 位置数据"
        },
        {
          "title": "2. 我们如何使用您的信息",
          "content": "我们使用收集的信息来：\n• 提供、维护和改进我们的服务\n• 处理交易并发送相关信息\n• 发送技术通知和支持消息\n• 回应您的评论和问题\n• 分析使用模式以改善用户体验"
        },
        {
          "title": "3. 信息共享",
          "content": "我们不会出售您的个人信息。我们可能会共享信息：\n• 与协助我们运营的服务提供商\n• 遵守法律义务\n• 保护我们的权利并防止欺诈\n• 经您同意或按您的指示"
        },
        {
          "title": "4. 数据安全",
          "content": "我们实施行业标准的安全措施：\n• 传输中数据的 SSL/TLS 加密\n• 敏感数据的加密存储\n• 定期安全审计\n• 访问控制和身份验证"
        },
        {
          "title": "5. 数据保留",
          "content": "只要您的账户处于活跃状态，我们就会保留您的数据。您可以随时通过联系支持团队请求删除您的账户和相关数据。"
        },
        {
          "title": "6. 您的权利",
          "content": "您有权：\n• 访问您的个人数据\n• 更正不准确的数据\n• 请求删除您的数据\n• 导出您的数据\n• 退出营销通信"
        },
        {
          "title": "7. Cookie 和跟踪",
          "content": "我们使用必要的 Cookie 进行身份验证和会话管理。我们可能使用分析工具来了解使用模式。您可以通过浏览器设置控制 Cookie 偏好。"
        },
        {
          "title": "8. 儿童隐私",
          "content": "我们的服务仅供 18 岁及以上用户使用。我们不会故意收集 18 岁以下儿童的信息。如果您认为儿童向我们提供了个人信息，请联系我们。"
        },
        {
          "title": "9. 政策变更",
          "content": "我们可能会不时更新本隐私政策。我们将通过在此页面上发布新政策并更新\"最后更新\"日期来通知您任何更改。"
        },
        {
          "title": "10. 联系我们",
          "content": "如果您对本隐私政策有疑问，请通过以下方式联系我们：\n邮箱：privacy@cling-ai.com"
        }
      ]
    },
    "terms": {
      "title": "用户服务协议",
      "lastUpdated": "最后更新：2024年12月30日",
      "sections": [
        {
          "title": "1. 条款接受",
          "content": "访问或使用 AI Host（\"本服务\"）即表示您同意受本服务条款的约束。如果您不同意这些条款，请勿使用本服务。"
        },
        {
          "title": "2. 年龄要求",
          "content": "您必须年满 18 周岁才能使用本服务。使用本服务即表示您声明并保证您已年满 18 周岁。我们保留终止虚报年龄用户账户的权利。"
        },
        {
          "title": "3. 账户注册",
          "content": "要访问某些功能，您必须创建账户。您同意：\n• 提供准确完整的信息\n• 维护账户凭据的安全\n• 立即通知我们任何未经授权的访问\n• 对账户下的所有活动负责"
        },
        {
          "title": "4. 虚拟货币",
          "content": "本服务使用虚拟货币（\"钻石\"）进行交易：\n• 钻石没有真实的货币价值\n• 钻石不能兑换现金或在账户之间转移\n• 未使用的钻石不可退款，法律要求的情况除外\n• 我们保留修改钻石价格和套餐的权利"
        },
        {
          "title": "5. 可接受使用",
          "content": "您同意不会：\n• 将服务用于非法目的\n• 骚扰、辱骂或伤害他人\n• 试图访问其他用户的账户\n• 规避安全措施\n• 未经许可使用自动化工具\n• 分发恶意软件或有害内容\n• 侵犯知识产权"
        },
        {
          "title": "6. AI 生成内容",
          "content": "AI 角色生成的内容仅供娱乐目的：\n• AI 回复可能并不总是准确的\n• AI 内容不代表专业建议\n• 我们不对基于 AI 内容采取的行动负责\n• AI 角色是虚构的，不代表真实人物"
        },
        {
          "title": "7. 用户创建内容",
          "content": "当您创建内容（角色、图片等）时：\n• 您保留对原创内容的所有权\n• 您授予我们使用、展示和分发您内容的许可\n• 您有责任确保内容不违反法律\n• 我们可能会删除违反这些条款的内容"
        },
        {
          "title": "8. 知识产权",
          "content": "本服务及其原创内容受版权和其他知识产权法保护。未经许可，您不得复制、修改或分发我们的内容。"
        },
        {
          "title": "9. 支付条款",
          "content": "所有购买：\n• 由第三方支付提供商处理\n• 受提供商的条款和条件约束\n• 除法律要求外，为最终且不可退款\n• 需缴纳适用税款"
        },
        {
          "title": "10. 终止",
          "content": "如果您有以下情况，我们可能会暂停或终止您的账户：\n• 违反本服务条款\n• 从事欺诈活动\n• 滥用服务或其他用户\n\n您可以随时通过应用设置删除您的账户。"
        },
        {
          "title": "11. 免责声明",
          "content": "本服务按\"原样\"提供，不提供任何形式的保证。我们不保证服务将不间断、无错误或满足您的期望。"
        },
        {
          "title": "12. 责任限制",
          "content": "在法律允许的最大范围内，我们不对因您使用本服务而产生的任何间接、附带、特殊或后果性损害负责。"
        },
        {
          "title": "13. 条款变更",
          "content": "我们可能随时更新这些条款。在变更后继续使用本服务即表示接受新条款。"
        },
        {
          "title": "14. 联系方式",
          "content": "如对这些条款有疑问，请通过以下方式联系我们：\n邮箱：legal@cling-ai.com"
        }
      ]
    },
    "contentPolicy": {
      "title": "内容政策",
      "lastUpdated": "最后更新：2026年5月4日",
      "intro": "Cling AI 是一个面向 18 岁及以上成年人的创意工具。为了让所有人安全使用，我们对部分内容进行自动审核。本页解释我们具体审核什么、为什么审核、以及被拒绝时您可以怎么做。",
      "sections": [
        {
          "title": "1. 年龄判断（红线）",
          "content": "我们使用视觉模型对所有上传图像和生成结果进行年龄检测。任何被判定为可能涉及未成年人（少儿、未成年特征、儿童面部、青少年体型）的请求都会被立即阻断，且不退还所消耗的钻石。\n\n具体不允许：\n• 上传任何被判定可能为未成年人的人物照片\n• 在 prompt 中描述儿童、少年、未成年人等\n• 试图让生成结果的人物呈现未成年特征（学生制服、童年发型、明显幼态体型等）\n\n如果您是成年人但被误判（例如本人外貌偏年轻），可在 /feedback 提交申诉，附上证明照片。我们会在 48 小时内人工复核。"
        },
        {
          "title": "2. 真实公众人物",
          "content": "不允许上传或描述真实存在的公众人物（包括但不限于明星、运动员、政治人物、企业高管、网红）的面部用于成人内容生成。\n\n如果您想生成虚构角色，请使用 prompt 描述外貌特征，不要直接命名公众人物。"
        },
        {
          "title": "3. 暴力 / 自残 / 仇恨",
          "content": "不允许：\n• 真实暴力、流血、虐待\n• 自残、自杀引导\n• 基于种族、宗教、性别、性取向的仇恨内容\n• 恐怖主义相关内容"
        },
        {
          "title": "4. 非法内容",
          "content": "根据美国及国际法律，以下内容会被阻断并可能上报相关执法机构：\n• 任何儿童性虐待材料 (CSAM)\n• 真实人物的非自愿色情内容\n• 制造毒品、武器、爆炸物的指南\n• 教唆犯罪的内容"
        },
        {
          "title": "5. 被拒绝时怎么办",
          "content": "当您看到 \"Generation blocked\" 或 \"Content moderation triggered\" 时：\n\n1. 阅读上方拒绝提示，了解具体触发原因\n2. 如果您认为是误判（例如成年人被判为未成年），可以在 /feedback 提交申诉，包括：\n   • 您认为被误判的具体生成 ID\n   • 简单说明实际情况\n   • 如涉及年龄误判，可附上证明照片\n3. 我们的客服团队会在 24-48 小时内人工复核并回复\n\n⚠️ 重要：被审核拦截的请求所消耗的钻石不会自动退还。这是为了避免恶意用户反复尝试触发审核来获得免费配额。如果人工复核确认是误判，我们会同时退还钻石。"
        },
        {
          "title": "6. 政策变更",
          "content": "本政策可能随时根据法律要求和平台运营情况更新。重大变更我们会通过站内通知告知用户。建议定期查看本页面。"
        },
        {
          "title": "7. 联系我们",
          "content": "紧急合规问题：abuse@cling-ai.com\n申诉与支持：通过 /feedback 提交，或邮件 support@cling-ai.com"
        }
      ],
      "feedbackHint": "提交申诉"
    }
  },
  "en": {
    "faq": {
      "title": "Frequently Asked Questions",
      "subtitle": "Find answers to common questions about Cling AI",
      "items": [
        {
          "question": "What is Cling AI?",
          "answer": "Cling AI is an AI creation platform where you can create AI images and videos, transform photos into videos, swap faces, and explore ready-to-use creative tools."
        },
        {
          "question": "How do I create AI images or videos?",
          "answer": "Open Create, choose Image or Video, upload a photo if needed, write a prompt, and tap Generate. Your results are saved to Profile when generation completes."
        },
        {
          "question": "Is Cling AI free to use?",
          "answer": "Yes. You can start for free with daily rewards and trial credits. Higher-volume generation, longer videos, and premium features may require diamonds or VIP."
        },
        {
          "question": "How do I earn diamonds?",
          "answer": "You can earn diamonds through daily check-ins, selected tasks, invite rewards, and purchases. VIP also includes daily free image/video quota and daily diamonds."
        },
        {
          "question": "Can I share my creations with others?",
          "answer": "Yes. You can download results, share invite links, and use share-to-earn entry points when available. Some generated content may require review before public display."
        },
        {
          "question": "What languages does Cling AI support?",
          "answer": "Cling AI supports English, German, Japanese, Korean, Spanish, Arabic, French, Portuguese, Indonesian, Hindi, Vietnamese, Dutch, Polish, Turkish, Italian, Norwegian, and Filipino."
        },
        {
          "question": "How do I report inappropriate content?",
          "answer": "Use the report button where available, or open Feedback and include the content link, generation ID, and a short explanation. Our team reviews reports and applies the content policy."
        },
        {
          "question": "Can I delete my account?",
          "answer": "Yes. You can request account deletion from Settings or contact support. Account deletion is permanent and may remove your profile, creations, and history."
        }
      ]
    },
    "privacy": {
      "title": "Privacy Policy",
      "lastUpdated": "Last Updated: December 30, 2024",
      "sections": [
        {
          "title": "1. Information We Collect",
          "content": "We collect information you provide directly to us, including:\n• Account information (email, display name, profile picture)\n• Messages and content you create within the app\n• Payment information (processed securely by third-party providers)\n• Device information and usage data\n\nWe do NOT collect or store:\n• Your credit card numbers (handled by payment processors)\n• Biometric data\n• Location data"
        },
        {
          "title": "2. How We Use Your Information",
          "content": "We use the information we collect to:\n• Provide, maintain, and improve our services\n• Process transactions and send related information\n• Send technical notices and support messages\n• Respond to your comments and questions\n• Analyze usage patterns to improve user experience"
        },
        {
          "title": "3. Information Sharing",
          "content": "We do not sell your personal information. We may share information:\n• With service providers who assist our operations\n• To comply with legal obligations\n• To protect our rights and prevent fraud\n• With your consent or at your direction"
        },
        {
          "title": "4. Data Security",
          "content": "We implement industry-standard security measures:\n• SSL/TLS encryption for data in transit\n• Encrypted storage for sensitive data\n• Regular security audits\n• Access controls and authentication"
        },
        {
          "title": "5. Data Retention",
          "content": "We retain your data for as long as your account is active. You can request deletion of your account and associated data at any time by contacting support."
        },
        {
          "title": "6. Your Rights",
          "content": "You have the right to:\n• Access your personal data\n• Correct inaccurate data\n• Request deletion of your data\n• Export your data\n• Opt-out of marketing communications"
        },
        {
          "title": "7. Cookies and Tracking",
          "content": "We use essential cookies for authentication and session management. We may use analytics tools to understand usage patterns. You can control cookie preferences through your browser settings."
        },
        {
          "title": "8. Children's Privacy",
          "content": "Our service is intended for users aged 18 and older. We do not knowingly collect information from children under 18. If you believe a child has provided us with personal information, please contact us."
        },
        {
          "title": "9. Changes to This Policy",
          "content": "We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the \"Last Updated\" date."
        },
        {
          "title": "10. Contact Us",
          "content": "If you have questions about this Privacy Policy, please contact us at:\nEmail: privacy@cling-ai.com"
        }
      ]
    },
    "terms": {
      "title": "Terms of Service",
      "lastUpdated": "Last Updated: December 30, 2024",
      "sections": [
        {
          "title": "1. Acceptance of Terms",
          "content": "By accessing or using AI Host (\"the Service\"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service."
        },
        {
          "title": "2. Age Requirement",
          "content": "You must be at least 18 years old to use this Service. By using the Service, you represent and warrant that you are at least 18 years of age. We reserve the right to terminate accounts of users who misrepresent their age."
        },
        {
          "title": "3. Account Registration",
          "content": "To access certain features, you must create an account. You agree to:\n• Provide accurate and complete information\n• Maintain the security of your account credentials\n• Notify us immediately of any unauthorized access\n• Accept responsibility for all activities under your account"
        },
        {
          "title": "4. Virtual Currency",
          "content": "The Service uses virtual currency (\"Coins\") for transactions:\n• Coins have no real-world monetary value\n• Coins cannot be exchanged for cash or transferred between accounts\n• Unused Coins are non-refundable except as required by law\n• We reserve the right to modify Coin prices and packages"
        },
        {
          "title": "5. Acceptable Use",
          "content": "You agree NOT to:\n• Use the Service for illegal purposes\n• Harass, abuse, or harm others\n• Attempt to access other users' accounts\n• Circumvent security measures\n• Use automated tools without permission\n• Distribute malware or harmful content\n• Violate intellectual property rights"
        },
        {
          "title": "6. AI-Generated Content",
          "content": "Content generated by AI characters is for entertainment purposes only:\n• AI responses may not always be accurate\n• AI content does not represent professional advice\n• We are not responsible for actions taken based on AI content\n• AI characters are fictional and do not represent real people"
        },
        {
          "title": "7. User-Created Content",
          "content": "When you create content (characters, images, etc.):\n• You retain ownership of your original content\n• You grant us a license to use, display, and distribute your content\n• You are responsible for ensuring content does not violate laws\n• We may remove content that violates these terms"
        },
        {
          "title": "8. Intellectual Property",
          "content": "The Service and its original content are protected by copyright and other intellectual property laws. You may not copy, modify, or distribute our content without permission."
        },
        {
          "title": "9. Payment Terms",
          "content": "All purchases are:\n• Processed by third-party payment providers\n• Subject to the provider's terms and conditions\n• Final and non-refundable except as required by law\n• Subject to applicable taxes"
        },
        {
          "title": "10. Termination",
          "content": "We may suspend or terminate your account if you:\n• Violate these Terms of Service\n• Engage in fraudulent activity\n• Abuse the Service or other users\n\nYou may delete your account at any time through the app settings."
        },
        {
          "title": "11. Disclaimer of Warranties",
          "content": "THE SERVICE IS PROVIDED \"AS IS\" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR MEET YOUR EXPECTATIONS."
        },
        {
          "title": "12. Limitation of Liability",
          "content": "TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE."
        },
        {
          "title": "13. Changes to Terms",
          "content": "We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms."
        },
        {
          "title": "14. Contact",
          "content": "For questions about these Terms, contact us at:\nEmail: legal@cling-ai.com"
        }
      ]
    },
    "contentPolicy": {
      "title": "Content Policy",
      "lastUpdated": "Last Updated: May 4, 2026",
      "intro": "Cling AI is a creative tool for adults 18 and over. To keep everyone safe, we run automated moderation on certain content. This page explains what we actually enforce, why, and what you can do if a request is rejected.",
      "sections": [
        {
          "title": "1. Age detection (hard line)",
          "content": "We run a vision model over every uploaded image and every generation. Anything our model judges as possibly involving a minor (children, underage features, child faces, adolescent body proportions) is blocked immediately and the diamonds spent on that attempt are forfeit.\n\nSpecifically not allowed:\n• Uploading any photo where the subject could plausibly be under 18\n• Prompts describing children, teens, or underage subjects\n• Trying to push a generation toward minor-presenting features (school uniforms used as a stand-in for childhood, child-like proportions, etc.)\n\nIf you are an adult but were misclassified (e.g. you happen to look young), you can appeal via /feedback with a verifying photo. A human reviewer will respond within 48 hours."
        },
        {
          "title": "2. Real public figures",
          "content": "You cannot upload or prompt the face of a real, identifiable public figure (celebrities, athletes, politicians, business executives, influencers) for adult content generation.\n\nIf you want a fictional character, describe the appearance in your prompt instead of naming a real person."
        },
        {
          "title": "3. Violence / self-harm / hate",
          "content": "Not allowed:\n• Realistic violence, gore, or torture\n• Self-harm or suicide ideation\n• Hate content targeting race, religion, gender, or sexual orientation\n• Terrorism-related content"
        },
        {
          "title": "4. Illegal content",
          "content": "Per US and international law, the following will be blocked and may be reported to the appropriate authorities:\n• Any Child Sexual Abuse Material (CSAM)\n• Non-consensual sexual content depicting real people\n• Instructions for manufacturing drugs, weapons, or explosives\n• Content soliciting or inciting criminal acts"
        },
        {
          "title": "5. What to do if you are rejected",
          "content": "When you see \"Generation blocked\" or \"Content moderation triggered\":\n\n1. Read the rejection message — it usually identifies the specific category that triggered.\n2. If you believe it was a misjudgment (e.g. an adult was flagged as underage), open /feedback and include:\n   • The exact generation ID you think was misjudged\n   • A short explanation of the real situation\n   • For age-related appeals, attach a verifying photo\n3. Our team will review manually and respond within 24-48 hours.\n\nImportant: diamonds spent on moderation-blocked requests are not auto-refunded. That is intentional — otherwise bad actors would repeatedly trip moderation to farm free attempts. If a human reviewer overturns the block, the diamonds are refunded as part of that resolution."
        },
        {
          "title": "6. Changes to this policy",
          "content": "This policy may be updated to reflect legal requirements or operational changes. We will notify users of material changes via in-app notification. Please review this page periodically."
        },
        {
          "title": "7. Contact",
          "content": "Urgent compliance issues: abuse@cling-ai.com\nAppeals and general support: via /feedback or email support@cling-ai.com"
        }
      ],
      "feedbackHint": "Submit an appeal"
    }
  }
}

export function resolvePublicLocale(locale?: string | null): PublicLocale {
  return locale?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}
