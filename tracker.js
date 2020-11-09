
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
    const pushQueue = [current, next]
    let yield_count = n + 1

    const sortAscending = (a, b) => a - b

    const handler = (buf) => pushQueue.push(parseInt(buf.toString()))

    element.on(event, handler)

    while (yield_count) {
      if (!pushQueue.length) {
        await defer()
        continue
      }

      const result = pushQueue.sort(sortAscending).shift()
      yield result
      yield_count--

    }
    element.removeListener(event, handler)
    return
  }



  const response_generator = streamify(receiver, 'message')

  console.log("Sending tasks to workers...");

  sender.send(`${next} ${current}`)
  let interval = setInterval(() => {
    [current, next] = [next, current + next];
    sender.send(`${next} ${current}`)
    if (!(n--)) {
      clearInterval(interval)
    }
  });




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

async function* input_stream(stream) {
  const buffer = []
  const handler = (buff) => buffer.push(buff.toString)
  stream.on('data', handler)

  while (true) {
    if (!buffer.length) {
      await sleep(1000)
      continue
    }
    yield buffer.shift()
  }
}

const main = async () => {

  const input = input_stream(process.stdin)

  process.stdout.write('Enter Number:\t')
  for await (const item of input) {
    const generator = fib(parseInt(item))
    for await (const num of generator) {
      console.log(num)
    }
    process.stdout.write('Enter Number:\t')
  }
}

main()