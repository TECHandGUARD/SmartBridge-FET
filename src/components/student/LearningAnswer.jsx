import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const markdownComponents = {
  h1: ({ children }) => <h3 className="mt-4 mb-2 text-base font-semibold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-4 mb-2 text-base font-semibold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-3 mb-1.5 font-semibold first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-5 marker:text-primary">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-5 marker:font-medium">{children}</ol>,
  li: ({ children }) => <li className="pl-1 [&>p]:mb-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-primary/40 pl-3 text-muted-foreground">{children}</blockquote>,
  table: ({ children }) => <div role="region" aria-label="Scrollable answer table" tabIndex={0} className="my-3 max-w-full overflow-x-auto rounded-lg border border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><table className="w-full min-w-[18rem] border-collapse text-left text-sm">{children}</table></div>,
  th: ({ children }) => <th scope="col" className="border-b border-border bg-background/70 px-3 py-2 align-top font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-border/60 px-3 py-2 align-top last:border-b-0">{children}</td>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="break-words text-primary underline underline-offset-2">{children}</a>,
  pre: ({ children }) => <pre className="my-3 max-w-full overflow-x-auto rounded-lg bg-background/70 p-3 text-xs">{children}</pre>,
  code: ({ children, className }) => <code className={className || 'rounded bg-background/70 px-1 py-0.5 text-[0.9em]'}>{children}</code>,
};

export default function LearningAnswer({ content }) {
  return <div data-testid="learning-answer" className="min-w-0 break-words leading-7 [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden">
    <ReactMarkdown skipHtml disallowedElements={['img', 'input']} remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { trust: false, throwOnError: false, maxExpand: 1000, maxSize: 20 }]]} components={markdownComponents}>
      {content}
    </ReactMarkdown>
  </div>;
}
LearningAnswer.propTypes = { content: PropTypes.string.isRequired };
