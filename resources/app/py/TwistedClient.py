import sys, json

#Read data from stdin
def recvData():
    #Reads data from the parent process
    return json.loads(sys.stdin.readlines())

def main():
	#Client Base
	data = recvData()
	print( str(data) + " --From @TwClient")
	sys.stdout.flush()

#start process
if __name__ == '__main__':
    main()