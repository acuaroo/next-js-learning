import { sanityClient, urlFor } from '../../sanity'
import Header from '../../components/Header'
import { Post } from '../../typings'
import { GetStaticProps } from 'next'
import PortableText from 'react-portable-text'
import { useForm, SubmitHandler } from 'react-hook-form'
import { useState } from 'react'

interface Props {
  post: Post
}

interface IFormInput {
  _id: string
  name: string
  email: string
  comment: string
}

function Post({ post }: Props) {
  const [submitted, setSubmitted] = useState(false);

  console.log(post);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IFormInput>();

  const onSubmit: SubmitHandler<IFormInput> = async (data) => {
    await fetch("/api/createComment", {
      method: "POST",
      body: JSON.stringify(data)
    }).then(() => {
      console.log(data);
      setSubmitted(true);
    }).catch((err) => {
      console.log(err);
      setSubmitted(false);
    })
  }

  return (
    <div>
      <Header />

      <img
        className="h-40 w-full object-cover"
        src={urlFor(post.mainImage).url()!}
        alt="Main Image"
      />

      <article className="mx-auto max-w-3xl p-5">
        <h1 className="mt-10 mb-3 text-3xl">{post.title}</h1>
        <h2 className="mb-2 text-xl font-light text-gray-500">
          {post.description}
        </h2>

        <div className="flex items-center space-x-2">
          <img
            className="h-10 w-10 rounded-full"
            src={urlFor(post.author.image).url()!}
            alt="Profile Picture"
          />
          <p className="text-sm font-extralight">
            Blog post by{' '}
            <span className=" text-green-600">{post.author.name}</span>-
            Published at {new Date(post._createdAt).toLocaleString()}
          </p>
        </div>

        <div className="mt-10">
          <PortableText
            dataset={process.env.NEXT_PUBLIC_SANITY_DATASET!}
            projectId={process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!}
            content={post.body}
            serializers={{
              h1: (props: any) => (
                <h1 className="my-5 text-2xl font-bold" {...props} />
              ),
              h2: (props: any) => (
                <h1 className="my-5 text-xl font-bold" {...props} />
              ),
              li: (props: any) => <li className="ml-4 list-disc" {...props} />,
              link: ({ href, children }: any) => (
                <a href={href} className="text-blue-400 hover:underline">
                  {children}
                </a>
              ),
            }}
          />
        </div>
      </article>
      <hr className="my-5 mx-auto max-w-lg border border-yellow-500" />

      {submitted? (
        <div className="flex flex-col items-center mx-auto bg-yellow-500">
          <h3 className="text-3xl text-white font-semibold">
            Thank you for your submission!
          </h3>
          <p className="text-sm font-light italic text-white">Your comment is now pending approval, it will appear below once approved!</p>
        </div>
      ): (
        <form onSubmit={handleSubmit(onSubmit)} className="mx-auto mb-10 flex max-w-2xl flex-col p-5">
        <h3 className="text-yello-500 text-sm">Enjoyed this article?</h3>
        <h4 className="text-3xl font-bold">Leave a comment below!</h4>
        <hr className="mt-2 py-3" />

        <input {...register('_id')} type="hidden" name="_id" value={post._id} />

        <label className="mb-5 block">
          <span className="text-gray-700">Name</span>
          <input
            {...register('name', { required: true })}
            className="form-input mt-1 block w-full rounded border py-2 px-3 shadow outline-none ring-yellow-500 focus:ring"
            placeholder="John Apple Doe"
            type="text"
          />
        </label>
        <label className="mb-5 block">
          <span className="text-gray-700">Email</span>
          <input
            {...register('email', { required: true })}
            className="form-input mt-1 block w-full rounded border py-2 px-3 shadow outline-none ring-yellow-500 focus:ring"
            placeholder="john.apple@doe.com"
            type="email"
          />
        </label>
        <label className="mb-5 block">
          <span className="text-gray-700">Comment</span>
          <textarea
            {...register('comment', { required: true })}
            className="form-textarea mt-1 block w-full rounded border py-2 px-3 shadow outline-none ring-yellow-500 focus:ring"
            placeholder="Make sure you're following the community guidelines and are respectful to the poster!"
            rows={8}
          />
        </label>
        <div className="flex flex-col p-5">
          {errors.name && (
            <span className="text-red-600"> - Your name is required</span>
          )}
          {errors.email && (
            <span className="text-red-600"> - Your email is required</span>
          )}
          {errors.comment && (
            <span className="text-red-600"> - Your comment is required</span>
          )}
        </div>

        <input
          className="focus:shadow-outline cursor-pointer rounded bg-yellow-500 py-2 px-4 font-bold text-white shadow hover:bg-yellow-400 focus:outline-none"
          type="submit"
        />
      </form>
      )}

      <div className="flex flex-col px-10 py-10 my-10 max-w-2xl mx-auto shadow-yellow-500 shadow space-y-2">
        <h3 className="text-4xl">Comments</h3>
        <hr className="pb-2"/>

        {post.comments.map((comment) => (
          <div key={comment._id}>
            
            <p>
              <span className="text-yellow-500 font-semibold">{comment.name}: </span>
              {comment.comment}
            </p>
          </div>
        ))}
      </div>
     
    </div>
  )
}

export default Post

export const getStaticPaths = async () => {
  const query = `*[_type == "post"] {
    _id,
    slug {
    current
    }
  }`

  const posts = await sanityClient.fetch(query)

  const paths = posts.map((post: Post) => ({
    params: {
      slug: post.slug.current,
    },
  }))

  return {
    paths,
    fallback: 'blocking',
  }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const query = `*[_type == "post" && slug.current == $slug][0] {
    _id,
    _createdAt,
    title,
    author-> {
      name,
      image
    },
    'comments': *[
      _type == "comment" &&
      post._ref == ^._id &&
      approved == true],
    description,
    mainImage,
    slug,
    body
  }`
  const post = await sanityClient.fetch(query, {
    slug: params?.slug,
  })

  if (!post) {
    return { notFound: true }
  }

  return {
    props: {
      post,
    },
    revalidate: 60, // after 60 seconds, refresh the old cache
  }
}