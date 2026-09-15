import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import './creation-media.css'

interface CreationResultProps {
  kind: 'image' | 'video'
  url?: string
}

/** 仅由完成态挂载，审核没收和失败态不得通过此组件暴露媒体地址。 */
export function CreationResult({ kind, url }: CreationResultProps) {
  return <section className="creation-result" aria-label="生成结果">
    <p role="status">生成完成</p>
    {url ? <ResultMedia key={`${kind}:${url}`} kind={kind} url={url} /> : <p>作品地址暂未返回，请稍后在作品中查看。</p>}
  </section>
}

function ResultMedia({ kind, url }: { kind: CreationResultProps['kind']; url: string }) {
  const [failed, setFailed] = useState(false)
  return <>
    {failed ? <p role="alert">作品加载失败，请稍后在作品中查看。</p> : kind === 'image'
      ? <img className="creation-result__media" src={url} alt="生成结果" onError={() => setFailed(true)} />
      : <video className="creation-result__media" src={url} aria-label="生成视频" controls playsInline preload="metadata" onError={() => setFailed(true)} />}
    {/* 加载失败只影响展示，不重放创建请求，也不把任务终态改为生成失败。 */}
    <a className="creation-result__original" href={url} target="_blank" rel="noopener noreferrer">
      <ExternalLink size={16} aria-hidden="true" />查看原文件
    </a>
  </>
}
