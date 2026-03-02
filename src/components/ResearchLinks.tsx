interface Props {
  isbn: string;
}

interface LinkDef {
  label: string;
  title: string;
  href: (isbn: string) => string;
  emoji: string;
}

const LINKS: LinkDef[] = [
  {
    label: 'AMZ',
    title: 'Amazon AU',
    href: isbn => `https://www.amazon.com.au/s?k=${isbn}`,
    emoji: '🛒',
  },
  {
    label: 'BS',
    title: 'BookScouter',
    href: isbn => `https://bookscouter.com/book/${isbn}`,
    emoji: '📊',
  },
  {
    label: 'GR',
    title: 'Goodreads',
    href: isbn => `https://www.goodreads.com/search?q=${isbn}`,
    emoji: '⭐',
  },
];

export function ResearchLinks({ isbn }: Props) {
  return (
    <div className="flex gap-1">
      {LINKS.map(link => (
        <a
          key={link.label}
          href={link.href(isbn)}
          target="_blank"
          rel="noopener noreferrer"
          title={link.title}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 transition-colors whitespace-nowrap"
        >
          {link.emoji} {link.label}
        </a>
      ))}
    </div>
  );
}
