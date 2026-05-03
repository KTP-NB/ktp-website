'use client';

const spotlightSections = [
    {
        title: 'Chapter Events',
        posts: [
            {
                src: 'https://www.linkedin.com/embed/feed/update/urn:li:activity:7455643406304845824',
                href: 'https://www.linkedin.com/posts/noahfox24_had-an-amazing-time-representing-guardian-activity-7455643406304845824-HTO0',
                height: 645,
                title: 'Chapter Events LinkedIn post',
            },
        ],
    },
    {
        title: 'Internships',
        posts: [
            {
                src: 'https://www.linkedin.com/embed/feed/update/urn:li:share:7454530076777381888?collapsed=1',
                href: 'https://www.linkedin.com/feed/update/urn:li:share:7454530076777381888',
                height: 645,
                title: 'Internship LinkedIn post',
            },
        ],
    },
    {
        title: 'Programs',
        posts: [
            {
                src: 'https://www.linkedin.com/embed/feed/update/urn:li:share:7456056574806142976?collapsed=1',
                href: 'https://www.linkedin.com/feed/update/urn:li:share:7456056574806142976',
                height: 531,
                title: 'Program LinkedIn post',
            },
        ],
    },
    {
        title: 'Hackathons',
        posts: [
            {
                src: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7454658652143239169?collapsed=1',
                href: 'https://www.linkedin.com/feed/update/urn:li:ugcPost:7454658652143239169',
                height: 628,
                title: 'Hackathon LinkedIn post',
            },
        ],
    },
    {
        title: 'Post-Grad',
        posts: [
            {
                src: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7326710916358574080',
                href: 'https://www.linkedin.com/feed/update/urn:li:ugcPost:7326710916358574080',
                height: 1048,
                title: 'Post-Grad LinkedIn post',
            },
        ],
    },
];

function SpotlightPost({ post }) {
    return (
        <div className="relative w-full max-w-[504px] overflow-hidden rounded-2xl border border-blue-100/35 shadow-[0_16px_36px_rgba(18,40,82,0.34)]">
            <iframe
                src={post.src}
                height={post.height}
                width="504"
                frameBorder="0"
                allowFullScreen
                title={post.title}
                className="block w-full"
            />
            <a
                href={post.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${post.title} in a new tab`}
                className="absolute inset-0"
            />
        </div>
    );
}

export default function SpotlightPage() {
    return (
        <main className="min-h-screen px-6 pb-20 pt-32 text-white lg:px-8 lg:pt-40">
            <section className="mx-auto max-w-7xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">KTP Highlights</p>
                <h1 className="mt-3 text-5xl font-black tracking-tight text-blue-100 sm:text-6xl">Chapter Spotlight</h1>
            </section>

            <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-12">
                {spotlightSections.map((section) => (
                    <section
                        key={section.title}
                        className="rounded-3xl border border-blue-100/35 bg-[#dbe8ff]/28 p-8 shadow-[0_16px_45px_rgba(16,36,76,0.30)] backdrop-blur-xl md:p-10 lg:p-12"
                    >
                        <h2 className="text-3xl font-black tracking-tight text-blue-200 sm:text-4xl">{section.title}</h2>
                        <div className="mt-8 flex flex-wrap justify-center gap-8">
                            {section.posts.map((post) => (
                                <SpotlightPost key={post.src} post={post} />
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </main>
    );
}
