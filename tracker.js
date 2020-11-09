
const zmq = require('zeromq');

const sender = zmq.socket('push');
sender.bindSync("tcp://*:5557");

const receiver = zmq.socket('pull');
receiver.bindSync("tcp://*:5558");

const { promisify } = require('util')
const sleep = promisify(setTimeout)
const defer = promisify(setImmediate)

const {
  NUMBER = '10'
} = process.env

async function* fib(n = 10) {
  let current = 0;
  let next = 1;

  async function* streamify(element, event) {
    let pushQueue = [current, next]
    let yield_count = n + 1

    const sortAscending = (a, b) => a - b

    const handler = (buf) => {

      if (pushQueue.length) {
        // Sort Items in order before pushing. items from workers may come out of order. 
        pushQueue = pushQueue.sort(sortAscending)
      }
      pushQueue.push(parseInt(buf.toString()))
    }

    element.on(event, handler)

    // Await expected number of values
    while (yield_count) {
      // Trap underflowing queue here.
      if (!pushQueue.length) {
        // Defer execution to next even loop iteration, as not to block the event loop.
        await defer()
        continue
      }

      // Yield the queue 
      yield pushQueue.shift()
      yield_count--

    }

    // cleanup the event emmitter on done.
    element.removeListener(event, handler)
    return
  }



  const response_generator = streamify(receiver, 'message')

  console.log("Sending tasks to workers...");

  sender.send(`${next} ${current}`)

  const schedule = () => {
    [current, next] = [next, current + next];
    sender.send(`${next} ${current}`)
    if ((n--)) {
      setImmediate(schedule)
    }
  }

  setImmediate(schedule)

  // Waiting for Responses
  for await (const result of response_generator) {

    if (result === undefined) {
      await defer()
    } else {
      yield result
    }

  }
  return
}

async function* input_stream(stream = process.stdin) {
  const buffer = []
  const handler = (buff) => buffer.push(buff.toString())
  stream.on('data', handler)

  while (true) {
    if (!buffer.length) {
      await sleep(1000)
    } else {
      const item = buffer.shift()
      yield item
    }

  }
}

const main = async () => {
  const input_message = 'Enter Number:\t'
  process.stdout.write(input_message)
  for await (const input of input_stream(process.stdin)) {

    const generator = fib(parseInt(input))
    for await (const num of generator) {
      console.log(num)
    }
    process.stdout.write(input_message)
  }

}

main()