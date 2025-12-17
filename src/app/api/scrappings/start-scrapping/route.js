// app/api/scrappings/start-scrapping/route.js
import { NextResponse } from 'next/server'


export async function POST(req) {
  try {
    const { scrapping } = await req.json()

    if (!scrapping) {
      return NextResponse.json(
        { error: 'Missing scrapping data' },
        { status: 400 }
      )
    }

    const {
      id,
      user_id,
      method,
      queries,
      urls,
      name
    } = scrapping

    console.log('Starting scrapping job:', {
      id,
      name,
      method,
      queryCount: queries?.length || 0,
      urlCount: urls?.length || 0,
      timestamp: new Date().toISOString()
    })

    // 🔥 Here's where you trigger your background job:
    // Option 1: Trigger.dev integration
    /*
    import { client } from '@/lib/trigger'
    await client.sendEvent({
      name: "scrapping.job",
      payload: { scrappingId: id, method, queries, urls }
    })
    */

    // await client.sendEvent({
    //   name: "scrapping.job",
    //   payload: {
    //     scrappingId: scrapping.id,
    //     urls:
    //       scrapping.method === "urls"
    //         ? scrapping.urls
    //         : [], // query-based handled later
    //   },
    // });

    

    // For now, just return success
    return NextResponse.json({
      success: true,
       message: "Scrapping job sent to Trigger.dev",
      scrappingId: id,
      runId: handle.id,
    
      timestamp: new Date().toISOString()
    })
    
  } catch (err) {
    console.error('Error in start-scrapping API:', err)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      },
      { status: 500 }
    )
  }
}