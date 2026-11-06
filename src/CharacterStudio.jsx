import { tr, useLocale } from "./locale";
import React, { useEffect, useState } from "react";
export function CharacterStudio({ api, onApply, busy }) {
  useLocale();
  const [jobs, setJobs] = useState([]),
    [id, setId] = useState(""),
    [input, setInput] = useState({ name: "", work: "", customSetting: "" }),
    [working, setWorking] = useState(false),
    [message, setMessage] = useState(""),
    [direction, setDirection] = useState("balanced"),
    [style, setStyle] = useState("anime"),
    [requirements, setRequirements] = useState(""),
    [selected, setSelected] = useState("");
  const job = jobs.find((j) => j.id === id);
  const inFlight =
    working ||
    jobs.some((j) =>
      ["drafting", "generating", "producing"].includes(j.status),
    );
  useEffect(() => {
    api
      .studioList()
      .then(setJobs)
      .catch((e) => setMessage(e.message));
    return api.onEvent((e) => {
      if (e.method === "client/studio" && e.params.stage !== "working") {
        setMessage({ production: e.params.message });
        if (e.params.jobId)
          api
            .studioList()
            .then((list) => {
              setJobs(list);
              setId(e.params.jobId);
            })
            .catch(() => {});
      }
    });
  }, []);
  async function run(action) {
    setWorking(true);
    setMessage(tr("正在处理，请稍候…"));
    try {
      const result = await action();
      if (result?.id) {
        setJobs((old) => [result, ...old.filter((j) => j.id !== result.id)]);
        setId(result.id);
      }
      setMessage(
        tr("已完成。你可以在桌面查看角色；单独生成的草稿仍可继续编辑。"),
      );
    } catch (e) {
      setMessage(e.message);
      const saved = await api.studioList();
      setJobs(saved);
      if (!id && saved[0]) setId(saved[0].id);
    } finally {
      setWorking(false);
    }
  }
  return (
    <section className="character-studio" data-testid="character-studio">
      <div className="section-kicker">{tr("Character studio")}</div>
      <h2>{tr("让角色成为你的搭档")}</h2>
      <p>{tr("名字 → 档案与语气 → 形象与动作 → 过渡帧 → 自动启用")}</p>
      <div className="field-pair">
        <label>
          {tr("角色名称")}
          <input
            data-testid="studio-name"
            maxLength={80}
            value={input.name}
            onChange={(e) => setInput({ ...input, name: e.target.value })}
          />
        </label>
        <label>
          {tr("来自哪部作品")}
          <input
            data-testid="studio-work"
            maxLength={200}
            value={input.work}
            placeholder={tr("原创角色可留空")}
            onChange={(e) => setInput({ ...input, work: e.target.value })}
          />
        </label>
      </div>
      <label>
        {tr("你的补充设定")}
        <textarea
          maxLength={2000}
          value={input.customSetting}
          onChange={(e) =>
            setInput({ ...input, customSetting: e.target.value })
          }
          placeholder={tr("希望怎样称呼你、性格或外观要求…")}
        />
      </label>
      <p>
        {tr(
          "一键制作使用你在「角色大脑」中配置的 Codex 模型和 effort，通过本机图像工具制作基准形象与 7 组动作图集。会使用账号额度，制作多组动作需要较长时间，可以收起界面等待；不具备图像能力时会保留进度并说明原因。",
        )}
      </p>
      <button
        data-testid="studio-produce"
        className="primary-button"
        disabled={busy || inFlight || !input.name.trim()}
        onClick={() =>
          run(async () => {
            const result = await api.studioProduce(input);
            await onApply(result.preferences);
            return result.job;
          })
        }
      >
        {tr("一键制作并启用桌宠")}
      </button>
      <button
        className="primary-button"
        data-testid="studio-draft"
        disabled={busy || inFlight || !input.name.trim()}
        onClick={() => run(() => api.studioDraft(input))}
      >
        {tr("生成档案与对话风格")}
      </button>
      {jobs.length > 0 && (
        <label>
          {tr("本机制作记录")}
          <select
            data-testid="studio-jobs"
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setSelected("");
            }}
          >
            <option value="">{tr("选择草稿")}</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.input.name} · {j.input.work || tr("原创")} ·{" "}
                {tr("studio.status." + j.status)}
              </option>
            ))}
          </select>
        </label>
      )}
      {job?.profile &&
        !["drafting", "generating", "producing"].includes(job.status) && (
          <button
            disabled={busy || inFlight}
            onClick={() =>
              run(async () => {
                const result = await api.studioProduce({ id: job.id });
                await onApply(result.preferences);
                return result.job;
              })
            }
          >
            {job.petPack
              ? tr("重新启用这只桌宠")
              : tr("从已有进度继续制作桌宠")}
          </button>
        )}
      {job?.stage && <p>{tr(job.stage)}</p>}
      {job?.petFiles && (
        <p>
          {tr("已完成动作组：")}
          {Object.keys(job.petFiles).length} / 7
        </p>
      )}
      {job?.profile && (
        <>
          <article className="profile-preview">
            <span className="draft-badge">
              {job.profile.research?.status === "web-researched"
                ? tr("已检索公开资料 · 模型整理")
                : tr("资料不足 · 人设草稿")}
            </span>
            <h3>{job.profile.name}</h3>
            <p>{job.profile.summary}</p>
            {job.profile.research && (
              <details>
                <summary>{tr("角色资料、原作短台词与来源")}</summary>
                <p>{job.profile.research.identity}</p>
                <p>{tr(job.profile.research.note)}</p>
                {[
                  ...(job.profile.research.background || []),
                  ...(job.profile.research.traits || []),
                ].map((v, i) => (
                  <p key={i}>
                    {v.text} <small>{v.context}</small>
                  </p>
                ))}
                {(job.profile.research.quotes || []).map((v, i) => (
                  <blockquote key={i}>
                    {v.text}
                    <small> — {v.context}</small>
                  </blockquote>
                ))}
                {(job.profile.research.sources || []).map((v, i) => (
                  <p key={i}>
                    <a href={v.url} target="_blank" rel="noreferrer">
                      {v.title || v.url}
                    </a>{" "}
                    ·{" "}
                    {v.kind === "official"
                      ? tr("官方资料（模型分类）")
                      : tr("二手资料")}
                  </p>
                ))}
                <p>{job.profile.research.unknowns?.join("；")}</p>
              </details>
            )}
            <h4>{tr("说话方式")}</h4>
            <ul>
              {job.profile.voiceRules.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
            <details>
              <summary>{tr("示例台词、外观与待核实内容")}</summary>
              <p>{job.profile.appearance}</p>
              {job.profile.sampleLines.map((v, i) => (
                <blockquote key={i}>{v}</blockquote>
              ))}
              <p>{tr("示例为创作台词，不是原作引文。")}</p>
              <p>{job.profile.unknowns.join("；")}</p>
            </details>
          </article>
          <div className="field-pair">
            <label>
              {tr("画风")}
              <select value={style} onChange={(e) => setStyle(e.target.value)}>
                <option value="anime">{tr("精绘 2D")}</option>
                <option value="chibi">{tr("圆润 Q 版桌宠")}</option>
                <option value="pixel">{tr("像素")}</option>
              </select>
            </label>
            <label>
              {tr("设计方向")}
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
              >
                <option value="balanced">{tr("均衡表现")}</option>
                <option value="bold">{tr("鲜明轮廓")}</option>
                <option value="soft">{tr("柔和神态")}</option>
              </select>
            </label>
          </div>
          <label>
            {tr("形象要求")}
            <textarea
              value={requirements}
              maxLength={600}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder={tr("服装、发型、配色…")}
            />
          </label>
          <p>
            {tr(
              "通过本机 Codex 的图像工具生成一张静态立绘；使用相应账号额度。若工具不可用，会显示失败原因。",
            )}
          </p>
          <button
            data-testid="studio-generate"
            disabled={busy || inFlight}
            onClick={() =>
              run(() =>
                api.studioGenerate({ id, direction, style, requirements }),
              )
            }
          >
            {tr("制作一张形象候选")}
          </button>
          <div className="candidate-grid">
            {job.candidates.map((c) => (
              <button
                key={c.id}
                data-testid="studio-candidate"
                className={selected === c.id ? "selected" : ""}
                aria-pressed={selected === c.id}
                onClick={() => setSelected(c.id)}
              >
                <img src={c.src} alt={job.profile.name + tr("候选形象")} />
                <span>
                  {tr(
                    { anime: "精绘 2D", chibi: "圆润 Q 版桌宠", pixel: "像素" }[
                      c.style
                    ] || c.style,
                  )}{" "}
                  ·{" "}
                  {tr(
                    {
                      balanced: "均衡表现",
                      bold: "鲜明轮廓",
                      soft: "柔和神态",
                    }[c.direction] || c.direction,
                  )}
                </span>
              </button>
            ))}
          </div>
          {selected && (
            <>
              <details>
                <summary>{tr("放大检查选中的形象")}</summary>
                <img
                  className="candidate-full"
                  src={job.candidates.find((c) => c.id === selected)?.src}
                  alt={tr("形象大图")}
                />
              </details>
              <button
                className="primary-button"
                data-testid="studio-apply"
                disabled={busy || inFlight}
                onClick={() =>
                  run(async () => {
                    await onApply(
                      await api.studioApply({ id, candidateId: selected }),
                    );
                  })
                }
              >
                {tr("确认形象与档案，启用角色")}
              </button>
            </>
          )}
        </>
      )}
      {inFlight && (
        <button onClick={() => api.studioCancel()}>{tr("取消制作")}</button>
      )}
      <p role="status">
        {message && typeof message === "object"
          ? tr("正在制作 · ") + tr(message.production)
          : tr(message || job?.error)}
      </p>
      <small>
        {tr(
          "草稿与候选保存在本机。新候选保留旧图；确认后加入角色库。未提供动作图时使用静态立绘。",
        )}
      </small>
    </section>
  );
}
