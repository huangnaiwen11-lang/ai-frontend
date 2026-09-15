/// <reference types="node" />

// @vitest-environment node

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  getLegacyRouteRedirect,
  LEGACY_ROUTE_REDIRECTS,
  ROUTES,
} from "./routes";

describe("路由契约", () => {
  it("只定义约定的规范路由，且地址完全一致", () => {
    expect(Object.keys(ROUTES)).toEqual([
      "home",
      "login",
      "register",
      "studioImage",
      "studioEdit",
      "studioVideo",
      "works",
      "wallet",
      "account",
      "settings",
      "faq",
      "privacy",
      "terms",
      "contentPolicy",
      "feedback",
      "notifications",
    ]);
    expect(ROUTES).toEqual({
      home: "/",
      login: "/login",
      register: "/register",
      studioImage: "/studio/image",
      studioEdit: "/studio/edit",
      studioVideo: "/studio/video",
      works: "/works",
      wallet: "/wallet",
      account: "/me",
      settings: "/settings",
      faq: "/faq",
      privacy: "/privacy",
      terms: "/terms",
      contentPolicy: "/content-policy",
      feedback: "/feedback",
      notifications: "/notifications",
    });
  });

  it("为每个旧深链指定唯一目标并始终丢弃查询参数", () => {
    expect(LEGACY_ROUTE_REDIRECTS).toEqual({
      "/create/image": { target: ROUTES.studioImage, preserveSearch: false },
      "/image-generator": { target: ROUTES.studioImage, preserveSearch: false },

      "/create/template-image": {
        target: ROUTES.studioEdit,
        preserveSearch: false,
      },
      "/undress": { target: ROUTES.studioEdit, preserveSearch: false },
      "/ai-undress": { target: ROUTES.studioEdit, preserveSearch: false },
      "/ai-clothes-off": { target: ROUTES.studioEdit, preserveSearch: false },
      "/face-swap": { target: ROUTES.studioEdit, preserveSearch: false },

      "/create/video": { target: ROUTES.studioVideo, preserveSearch: false },
      "/create/animate": { target: ROUTES.studioVideo, preserveSearch: false },
      "/photo-to-video": { target: ROUTES.studioVideo, preserveSearch: false },

      "/recharge": { target: ROUTES.wallet, preserveSearch: false },
      "/pricing": { target: ROUTES.wallet, preserveSearch: false },
      "/profile": { target: ROUTES.account, preserveSearch: false },
      "/settings/profile": { target: ROUTES.account, preserveSearch: false },
      "/settings/account": { target: ROUTES.account, preserveSearch: false },
    });
  });

  it("只为已登记的旧深链返回兼容映射", () => {
    expect(getLegacyRouteRedirect("/not-a-legacy-route")).toBeUndefined();

    const animateRedirect = getLegacyRouteRedirect("/create/animate");
    expect(animateRedirect).toBeDefined();
    if (!animateRedirect) {
      throw new Error("已登记的 Animate 深链必须存在兼容映射");
    }

    expect(animateRedirect.target).toBe(ROUTES.studioVideo);
    expect(animateRedirect.preserveSearch).toBe(false);
  });

  it("规范路由中不再暴露 Animate 入口", () => {
    expect(Object.values(ROUTES)).not.toContain("/create/animate");
  });

  it("路由定义不包含旧 Node API，并以只读字段暴露兼容规则", () => {
    const source = readFileSync(
      new URL("./routes.ts", import.meta.url),
      "utf8",
    );

    expect(source).not.toMatch(/https?:\/\//i);
    expect(source).not.toMatch(/\/api(?:\/|$)/i);
    expect(source).toMatch(/readonly\s+target\s*:/);
    expect(source).toMatch(/readonly\s+preserveSearch\s*:/);
  });
});
