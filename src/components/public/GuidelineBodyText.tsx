// A guideline bullet's body is plain prose, but several bullets (e.g.
// "Required Documents", "Important Dates") embed their own short
// sub-headings as inline numbered/bulleted lines ("1. Applicant / Authorized
// Representative Aadhaar Card", "• Business / Firm Registration
// Certificate") rather than separate structured data — that's how the
// business's source document is written, and re-authoring it as nested data
// would risk drifting from the original wording. This renders those
// sub-heading lines bold so they stand out from the explanatory sentences
// around them, without changing the underlying content/data model.
//
// A line counts as a sub-heading only when it's short and has no sentence
// punctuation — e.g. "1. FSSAI License" bolds, but "1. KDB may request
// additional documents if required." does not, since the latter is a full
// sentence that happens to start with a number.
const SUB_HEADING_PATTERN = /^(?:\d+\.|•)\s*(.{1,80})$/

function isSubHeadingLine(line: string): boolean {
  const match = line.match(SUB_HEADING_PATTERN)

  if (!match) return false

  const rest = match[1].trim()

  return rest.length > 0 && !/[.?!]$/.test(rest)
}

const GuidelineBodyText = ({
  text,
  className,
  headingClassName = 'font-bold'
}: {
  text: string
  className?: string
  /** Color/weight classes applied only to detected sub-heading lines. */
  headingClassName?: string
}) => (
  <p className={className}>
    {text.split('\n').map((line, i, lines) => (
      <span key={i}>
        {isSubHeadingLine(line) ? <strong className={headingClassName}>{line}</strong> : line}
        {i < lines.length - 1 && '\n'}
      </span>
    ))}
  </p>
)

export default GuidelineBodyText
