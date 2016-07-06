/**
* CFRecoveryTool Module
*
* Description
*/
angular.module('CFRecoveryTool', [])

.controller('MainController', function($scope,$http){
	$scope.recovery = {
		network: 'test',
		addressToSend: '',
		phrase: '',
		cf_public_key: '',
		error: false,
		process: false,
		caption: 'Submit',
		message: ''
	};

	$scope.checkError = function(){
		$scope.recovery.error = false;
		$scope.recovery.message = '';

		if($scope.recovery.phrase.trim()=='' || $scope.recovery.cf_public_key.trim()=='')
		{
			$scope.recovery.error = true;
			$scope.recovery.message = 'All fields are required.';
		}

		if( $scope.recovery.phrase.split(" ").length < 24 )
		{
			$scope.recovery.error = true;
			$scope.recovery.message = 'Recovery phrase is a set of 24 words.';
		}
	}

	$scope.doRecovery = function(){
		$scope.checkError();

		if(!$scope.recovery.error){
			$scope.recovery.process = true;
			$scope.recovery.caption = 'Processing...';
			$http.post('/api/recover', { network: $scope.recovery.network, addressToSend: $scope.recovery.addressToSend, phrase: $scope.recovery.phrase, cf_public_key: $scope.recovery.cf_public_key }).then(function(result){
				$scope.recovery.process = false;
				$scope.recovery.caption = 'Submit';
				alert(result.data.message);
			},function(err){
				console.log(err);
				alert('Error');
			})
		}
	};

})