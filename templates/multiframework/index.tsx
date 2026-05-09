import React from 'react';
export default function Home({ title, email, description }: { title: string, email: string, description: string }) {
    return (
        <div>
            <h1>{title}</h1>
            <p>Contact: {email}</p>
            <p>{description}</p>
        </div>
    );
}
