import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/server-env'

function buildTools(step: string) {
  const tools: any[] = [
    {
      type: 'function',
      name: 'clarify',
      description: 'Ask a concise customer-facing clarification question when the user intent is ambiguous.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          message: { type: 'string' },
        },
        required: ['message'],
      },
      strict: true,
    },
  ]

  if (step === 'occupancy') {
    tools.push({
      type: 'function',
      name: 'select_occupancy',
      description: 'Select the travellers for the booking.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          adults: { type: 'integer', minimum: 1 },
          childrenAges: {
            type: 'array',
            items: { type: 'integer', minimum: 0, maximum: 17 },
          },
        },
        required: ['adults', 'childrenAges'],
      },
      strict: true,
    })
  }

  if (step === 'occupancy') {
    tools.push(
      {
        type: 'function',
        name: 'set_airport',
        description: 'Choose the departure airport from the valid airport codes.',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            airport: { type: 'string' },
          },
          required: ['airport'],
        },
        strict: true,
      },
      {
        type: 'function',
        name: 'set_package_group',
        description: 'Choose the package group from the valid package group IDs.',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            packageGroup: { type: ['string', 'null'] },
          },
          required: ['packageGroup'],
        },
        strict: true,
      },
      {
        type: 'function',
        name: 'set_nights_filter',
        description: 'Choose the nights filter. Null means flexible nights.',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            nights: { type: ['integer', 'null'] },
          },
          required: ['nights'],
        },
        strict: true,
      },
      {
        type: 'function',
        name: 'select_stay',
        description: 'Choose a concrete start date and trip length from the currently valid calendar.',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            startDate: { type: 'string' },
            nights: { type: 'integer', minimum: 1 },
          },
          required: ['startDate', 'nights'],
        },
        strict: true,
      },
      {
        type: 'function',
        name: 'select_flexible_stay',
        description: 'Choose a flexible start and end date combination.',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            startDate: { type: 'string' },
            endDate: { type: 'string' },
          },
          required: ['startDate', 'endDate'],
        },
        strict: true,
      },
    )
  }

  if (step === 'activities') {
    tools.push({
      type: 'function',
      name: 'select_activities',
      description: 'Choose the activity product IDs that should be selected now.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          leisureIds: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['leisureIds'],
      },
      strict: true,
    })
  }

  if (step === 'flights') {
    tools.push(
      {
        type: 'function',
        name: 'select_flight',
        description: 'Choose a valid flight ID.',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            flightId: { type: 'string' },
          },
          required: ['flightId'],
        },
        strict: true,
      },
      {
        type: 'function',
        name: 'skip_step',
        description: 'Skip the current optional step if appropriate.',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {},
        },
        strict: true,
      },
    )
  }

  if (step === 'cars') {
    tools.push({
      type: 'function',
      name: 'select_car',
      description: 'Choose a valid car ID and any selected extra IDs.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          carId: { type: 'string' },
          extraIds: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['carId', 'extraIds'],
      },
      strict: true,
    })
  }

  return tools
}

export async function POST(request: NextRequest) {
  const apiKey = getServerEnv('OPENAI_API_KEY')
  if (!apiKey) {
    return NextResponse.json({
      reply: 'Typed assistant actions are unavailable right now. Please use the visible booking controls.',
    })
  }

  const body = await request.json()
  const client = new OpenAI({ apiKey })
  const model = getServerEnv('OPENAI_MODEL') || 'gpt-5-mini'
  const tools = buildTools(body.currentStep)

  const response: any = await client.responses.create({
    model,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text:
              'You are a travel booking assistant. Use only the provided live options. If the user gives a clear valid instruction, call exactly one function. If they are ambiguous, call clarify with a short customer-facing question. Never invent dates, IDs, airports, package groups, prices, or product availability.',
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: JSON.stringify({
              message: body.message,
              currentStep: body.currentStep,
              payload: body.payload,
              options: body.options,
              recentMessages: body.messages,
            }),
          },
        ],
      },
    ],
    tools,
  })

  const functionCall = response.output?.find((item: any) => item.type === 'function_call')
  if (functionCall) {
    return NextResponse.json({
      action: {
        type: functionCall.name,
        arguments: JSON.parse(functionCall.arguments || '{}'),
      },
      reply: response.output_text || '',
    })
  }

  return NextResponse.json({
    reply: response.output_text || 'Please use the visible booking options.',
  })
}
