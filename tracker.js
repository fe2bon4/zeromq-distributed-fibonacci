
const zmq = require('zeromq');

const sender = zmq.socket('push');
sender.bindSync("tcp://*:5557");

const receiver = zmq.socket('pull');
receiver.bindSync("tcp://*:5558");

const { promisify } = require('util')
const sleep = promisify(setTimeout)



async function* fib (n = 10) {
  async function* streamify(element, event) {
    const pushQueue = [current, next]
  
    const sortAscending =  (a, b) => a-b
  
    const handler = (buf) => pushQueue.push(parseInt(buf.toString()))
  
    element.on(event, handler)
  
    while (pushQueue.length)  
      yield result = pushQueue.sort(sortAscending).shift()
  }

  let current = 0;
  let next = 1;

  const response_generator = streamify(receiver,'message')

  console.log("Sending tasks to workers...");

  let interval = setInterval(() => {
    [current, next] = [next, current + next];
    sender.send( `${next} ${current}`)

    if(!(n--)) {
      clearInterval( interval)
    }
  }, 500);

  

  // Waiting for Responses
  for await ( const result of response_generator) {
    await sleep(1000)
    if(result === undefined) {
      continue
    }
    yield result
  }
  return 
}

const main = async () => {
  

  process.stdin.on('data',async () => {
    const generator =  fib(30)
    for await( const num of generator) {
      console.log(num)
      
    }
    process.exit()
  })
}

main()