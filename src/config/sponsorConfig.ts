import type { SponsorConfig } from "../types/sponsorConfig";

export const sponsorConfig: SponsorConfig = {
	// 页面标题，如果留空则使用 i18n 中的翻译
	title: "",

	// 页面描述文本，如果留空则使用 i18n 中的翻译
	description: "",

	// 打赏用途说明（打赏已关闭，仅保留 GitHub 入口说明）
	usage:
		"打赏功能已关闭。如果你喜欢这个站点，欢迎到 GitHub 仓库逛逛、点个 Star 或提建议！",

	// 是否显示打赏者列表
	showSponsorsList: false,

	// 是否显示评论区，需要先在commentConfig.ts启用评论系统
	showComment: false,

	// 是否在文章详情页底部显示打赏按钮
	showButtonInPost: false,

	// 链接方式列表（仅保留 GitHub 跳转）
	methods: [
		{
			name: "GitHub",
			icon: "fa7-brands:github",
			qrCode: "",
			link: "https://github.com/shangq729-a11y/Firefly",
			description: "前往 GitHub 查看站点源码",
			enabled: true,
		},
	],

	// 打赏者列表（已关闭）
	sponsors: [],
};
