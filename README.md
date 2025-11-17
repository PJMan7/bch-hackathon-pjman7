BCH dApp starter repository featuring a testing suite set up to develop and test cashscript contracts and a Next.js web app to integrate them

How to Download and run

Prereqs:
Nodejs v24.11.1
npm v11.6.2

download directly from source dont rely on apt package as I found that the latest nodejs for my version of linux is only v18

You can use this code to download the latest
# Download and install nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# in lieu of restarting the shell
\. "$HOME/.nvm/nvm.sh"

# Download and install Node.js:
nvm install 24

# Verify the Node.js version:
node -v # Should print "v24.11.1".

# Verify npm version:
npm -v # Should print "11.6.2".

# Download the repository locally
git clone https://github.com/mainnet-pat/dapp-starter

# install
cd dapp-starter
yarn install
yarn build
yarn workspace @dapp-starter/dapp dev

# use a web browser either locally or remotely to access the webpage 
localhost:3000
192.x.x.x:3000

# Fork and clone repository for personal modification and adaptation 
# use the gitlab website to fork the project
git remote rename origin upstream
git remote add origin https://github.com/your-username/repository-name.git   

git remote set-url origin https://github.com/PJMan7/bch-hackathon-pjman7.git   
git remote add upstream https://github.com/mainnet-pat/dapp-starter.git   

git remote -v   

# Update fork with local changes to github

git add .
git commit -m "Your descriptive commit message"

Then push the changes to your forked repository on GitHub:

git push origin main
