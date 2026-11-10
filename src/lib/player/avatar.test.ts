// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const { setAvatar, getMe } = vi.hoisted(() => ({
  setAvatar: vi.fn(),
  getMe: vi.fn(),
}));

vi.mock("@/lib/backend/online.functions", () => ({
  setAvatar: (a: unknown) => setAvatar(a),
  getMe: () => getMe(),
}));

import { adoptOwnAvatarFromServer, getOwnAvatar, setOwnAvatar, syncOwnAvatar } from "./avatar";

const PICTURE = "data:image/jpeg;base64,AAA";

beforeEach(() => {
  localStorage.clear();
  setAvatar.mockReset().mockResolvedValue({ ok: true });
  getMe.mockReset();
});

describe("profile picture on a new device", () => {
  it("takes the server copy instead of erasing it", async () => {
    getMe.mockResolvedValue({ profile: { avatar_image: PICTURE } });
    await adoptOwnAvatarFromServer();
    expect(getOwnAvatar()).toBe(PICTURE);
    expect(setAvatar).not.toHaveBeenCalled();
    await syncOwnAvatar();
    expect(setAvatar).not.toHaveBeenCalled();
  });

  it("keeps a picture the player deliberately removed", async () => {
    getMe.mockResolvedValue({ profile: { avatar_image: null } });
    await setOwnAvatar(PICTURE);
    setAvatar.mockClear();
    await setOwnAvatar(null);
    expect(setAvatar).toHaveBeenCalledTimes(1);
    expect(setAvatar).toHaveBeenCalledWith({ data: { image: null } });
    await syncOwnAvatar();
    expect(setAvatar).toHaveBeenCalledTimes(1);
    await adoptOwnAvatarFromServer();
    expect(getOwnAvatar()).toBeNull();
  });

  it("stays quiet when the server cannot be reached", async () => {
    getMe.mockRejectedValue(new Error("offline"));
    await adoptOwnAvatarFromServer();
    expect(getOwnAvatar()).toBeNull();
    expect(setAvatar).not.toHaveBeenCalled();
  });
});
