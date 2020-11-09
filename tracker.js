
const zmq = require('zeromq');

const sender = zmq.socket('push');
sender.bindSync("tcp://*:5557");

const receiver = zmq.socket('pull');
receiver.bindSync("tcp://*:5558");

const { promisify } = require('util')
const defer = promisify(setImmediate)
const sleep = promisify(setTimeout)
async function* fib(n = 0) {
  let current = 0;
  let next = 1;

  async function* streamify(element, event) {
    let pushQueue = []
    let yield_count = n - 1

    const sortAscending = (a, b) => a - b

    const handler = (buf) => {
      const result = parseInt(buf.toString())
      console.log(`@Reciever: Got: ${result}`)
      pushQueue.push(result)
    }

    element.on(event, handler)

    // Await expected number of values
    while (yield_count > pushQueue.length) {
      await defer() // Defer loop execution to next event_loop interval.
    }
    // Yield the queue 
    yield pushQueue.sort(sortAscending).slice(0, yield_count)

    // cleanup the event emmitter on done.
    element.removeListener(event, handler)
    return
  }

  // Streamify the responses from workers
  const response_generator = streamify(receiver, 'message')

  console.log("Sending tasks to workers...");

  // Send out the first task
  sender.send(`${next} ${current}`)

  let count = n - 2
  // Scheduler function
  const schedule = async () => {
    [current, next] = [next, current + next];
    console.log(`Sending Job: ${next} ${current} `)
    sender.send(`${next} ${current}`)

    // While n > 0, schedule the execution of the scheduler function on the next event_loop iteration.
    if ((count--)) {
      setImmediate(schedule)
    }
  }

  // schedule the execution of the scheduler function on the next event_loop iteration.
  setImmediate(schedule)

  // Waiting for Responses
  for await (const result of response_generator) {
    yield result
  }
  return
}

async function* input_stream(stream = process.stdin, event = 'data') {
  const buffer = []
  const handler = (buff) => buffer.push(buff.toString())
  stream.on(event, handler)

  while (true) {
    if (!buffer.length) {
      await defer()
      continue
    } else {
      const item = buffer.shift()
      yield item
    }
  }
}

const main = async () => {
  const input_message = 'Enter Positive Number:\t'
  const error_message = 'Please Enter a valid number.'
  process.stdout.write(input_message)
  for await (const input of input_stream(process.stdin)) {
    const number = parseInt(input)

    if (number > 1) {
      const generator = fib(Math.abs(number) || 0)
      for await (const num of generator) {
        console.log(num)
      }
    } else {
      console.log(error_message)
    }

    await sleep(100)
    process.stdout.write(input_message)
  }

}

main()